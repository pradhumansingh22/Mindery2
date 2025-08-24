from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Create the main app
app = FastAPI(title="Team Management Dashboard")
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    username: str
    full_name: str
    role: str = "employee"  # employee or admin
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    role: str = "employee"

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AttendanceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    check_in_location: Optional[Dict] = None  # {lat, lng, address}
    check_out_location: Optional[Dict] = None
    work_location: str = "office"  # office or home
    is_in_office_radius: Optional[bool] = None
    total_hours: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    category: str
    priority: str = "medium"  # low, medium, high
    assigned_to: str
    created_by: str
    estimated_hours: float
    actual_hours: Optional[float] = None
    status: str = "pending"  # pending, in_progress, completed
    due_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    priority: str = "medium"
    assigned_to: str
    estimated_hours: float
    due_date: datetime

class LeaveRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: datetime
    end_date: datetime
    reason: str
    leave_type: str = "casual"  # casual, sick, vacation
    status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OfficeLocation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    latitude: float
    longitude: float
    radius_meters: int = 100  # Default 100m radius
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# Authentication Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if user exists
    existing = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or username already exists")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    user = User(**user_dict)
    user_doc = user.dict()
    user_doc["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_doc)
    return {"message": "User created successfully", "user": user}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    user_obj = User(**user)
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"username": current_user.username})
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"username": current_user.username},
        {"$set": {"hashed_password": new_hashed_password, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Password changed successfully"}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Office Location Routes
@api_router.post("/office-locations", response_model=OfficeLocation)
async def create_office_location(location: OfficeLocation, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create office locations")
    
    await db.office_locations.insert_one(location.dict())
    return location

@api_router.get("/office-locations", response_model=List[OfficeLocation])
async def get_office_locations():
    locations = await db.office_locations.find().to_list(1000)
    return [OfficeLocation(**loc) for loc in locations]

# Attendance Routes
@api_router.post("/attendance/check-in")
async def check_in(location_data: Dict, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    # Check if already checked in today
    existing = await db.attendance.find_one({"user_id": current_user.id, "date": today})
    if existing and existing.get("check_in_time"):
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    # Check if location is within office radius
    office_locations = await db.office_locations.find().to_list(1000)
    is_in_office = False
    
    if office_locations and location_data.get("latitude") and location_data.get("longitude"):
        from math import radians, cos, sin, asin, sqrt
        
        def haversine(lon1, lat1, lon2, lat2):
            # Convert decimal degrees to radians
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            # Haversine formula
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            r = 6371000  # Radius of earth in meters
            return c * r
        
        user_lat = location_data["latitude"]
        user_lng = location_data["longitude"]
        
        for office in office_locations:
            distance = haversine(user_lng, user_lat, office["longitude"], office["latitude"])
            if distance <= office["radius_meters"]:
                is_in_office = True
                break
    
    attendance_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "date": today,
        "check_in_time": datetime.now(timezone.utc),
        "check_in_location": location_data,
        "is_in_office_radius": is_in_office,
        "work_location": "office" if is_in_office else "home",
        "created_at": datetime.now(timezone.utc)
    }
    
    if existing:
        await db.attendance.update_one({"_id": existing["_id"]}, {"$set": attendance_data})
    else:
        await db.attendance.insert_one(attendance_data)
    
    return {"message": "Checked in successfully", "is_in_office": is_in_office}

@api_router.post("/attendance/check-out")
async def check_out(location_data: Dict, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    attendance = await db.attendance.find_one({"user_id": current_user.id, "date": today})
    if not attendance or not attendance.get("check_in_time"):
        raise HTTPException(status_code=400, detail="No check-in found for today")
    
    if attendance.get("check_out_time"):
        raise HTTPException(status_code=400, detail="Already checked out today")
    
    check_out_time = datetime.now(timezone.utc)
    check_in_time = attendance["check_in_time"]
    if isinstance(check_in_time, str):
        check_in_time = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
    
    total_hours = (check_out_time - check_in_time).total_seconds() / 3600
    
    await db.attendance.update_one(
        {"_id": attendance["_id"]},
        {"$set": {
            "check_out_time": check_out_time,
            "check_out_location": location_data,
            "total_hours": total_hours
        }}
    )
    
    return {"message": "Checked out successfully", "total_hours": round(total_hours, 2)}

@api_router.get("/attendance/today")
async def get_today_attendance(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    attendance = await db.attendance.find_one({"user_id": current_user.id, "date": today})
    
    if not attendance:
        return {"checked_in": False, "checked_out": False}
    
    return {
        "checked_in": bool(attendance.get("check_in_time")),
        "checked_out": bool(attendance.get("check_out_time")),
        "check_in_time": attendance.get("check_in_time"),
        "check_out_time": attendance.get("check_out_time"),
        "work_location": attendance.get("work_location"),
        "total_hours": attendance.get("total_hours")
    }

# Create default admin user
@app.on_event("startup")
async def create_default_admin():
    admin_exists = await db.users.find_one({"role": "admin"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@company.com",
            "username": "admin",
            "full_name": "System Administrator",
            "role": "admin",
            "is_active": True,
            "hashed_password": get_password_hash("admin123"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(admin_user)
        print("Default admin user created: admin/admin123")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()