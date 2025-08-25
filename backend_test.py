import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class TeamManagementAPITester:
    def __init__(self, base_url="https://teamdash-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.employee_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_task_id = None
        self.test_leave_id = None
        self.office_location_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
https://github.com/Vanshmakhija16/Mindery
    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"},
            description="Login with default admin credentials"
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained successfully")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            token=self.admin_token,
            description="Get current authenticated user info"
        )
        return success

    def test_create_employee_user(self):
        """Test creating a new employee user"""
        test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        user_data = {
            "email": f"{test_username}@company.com",
            "username": test_username,
            "full_name": "Test Employee",
            "password": "testpass123",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "Create Employee User",
            "POST",
            "auth/register",
            200,
            data=user_data,
            token=self.admin_token,
            description="Admin creates a new employee user"
        )
        
        if success and 'user' in response:
            self.test_user_id = response['user']['id']
            # Now login as the new employee
            login_success, login_response = self.run_test(
                "Employee Login",
                "POST",
                "auth/login",
                200,
                data={"username": test_username, "password": "testpass123"},
                description="Login with newly created employee credentials"
            )
            if login_success and 'access_token' in login_response:
                self.employee_token = login_response['access_token']
                print(f"   Employee token obtained successfully")
        
        return success

    def test_get_users(self):
        """Test getting all users (admin only)"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200,
            token=self.admin_token,
            description="Admin retrieves all users"
        )
        return success

    def test_create_office_location(self):
        """Test creating office location"""
        location_data = {
            "name": "Main Office",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "radius_meters": 100
        }
        
        success, response = self.run_test(
            "Create Office Location",
            "POST",
            "office-locations",
            200,
            data=location_data,
            token=self.admin_token,
            description="Admin creates office location"
        )
        
        if success and 'id' in response:
            self.office_location_id = response['id']
        
        return success

    def test_get_office_locations(self):
        """Test getting office locations"""
        success, response = self.run_test(
            "Get Office Locations",
            "GET",
            "office-locations",
            200,
            description="Get all office locations"
        )
        return success

    def test_attendance_check_in(self):
        """Test attendance check-in"""
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "address": "New York, NY"
        }
        
        success, response = self.run_test(
            "Attendance Check-in",
            "POST",
            "attendance/check-in",
            200,
            data=location_data,
            token=self.employee_token,
            description="Employee checks in with location"
        )
        return success

    def test_get_today_attendance(self):
        """Test getting today's attendance"""
        success, response = self.run_test(
            "Get Today's Attendance",
            "GET",
            "attendance/today",
            200,
            token=self.employee_token,
            description="Get current user's attendance for today"
        )
        return success

    def test_attendance_check_out(self):
        """Test attendance check-out"""
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "address": "New York, NY"
        }
        
        success, response = self.run_test(
            "Attendance Check-out",
            "POST",
            "attendance/check-out",
            200,
            data=location_data,
            token=self.employee_token,
            description="Employee checks out with location"
        )
        return success

    def test_create_task(self):
        """Test creating a task"""
        task_data = {
            "title": "Test Task",
            "description": "This is a test task",
            "category": "Development",
            "priority": "high",
            "assigned_to": self.test_user_id,
            "estimated_hours": 8.0,
            "due_date": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data,
            token=self.admin_token,
            description="Admin creates a new task"
        )
        
        if success and 'id' in response:
            self.test_task_id = response['id']
        
        return success

    def test_get_tasks(self):
        """Test getting tasks"""
        success, response = self.run_test(
            "Get Tasks (Admin)",
            "GET",
            "tasks",
            200,
            token=self.admin_token,
            description="Admin gets all tasks"
        )
        
        # Also test as employee
        success2, response2 = self.run_test(
            "Get Tasks (Employee)",
            "GET",
            "tasks",
            200,
            token=self.employee_token,
            description="Employee gets assigned tasks"
        )
        
        return success and success2

    def test_update_task_status(self):
        """Test updating task status"""
        if not self.test_task_id:
            print("❌ Skipping task status update - no task ID available")
            return False
            
        success, response = self.run_test(
            "Update Task Status",
            "PATCH",
            f"tasks/{self.test_task_id}/status",
            200,
            data={"status": "in_progress"},
            token=self.employee_token,
            description="Employee updates task status to in_progress"
        )
        return success

    def test_log_task_time(self):
        """Test logging task time"""
        if not self.test_task_id:
            print("❌ Skipping task time logging - no task ID available")
            return False
            
        success, response = self.run_test(
            "Log Task Time",
            "PATCH",
            f"tasks/{self.test_task_id}/time",
            200,
            data={"actual_hours": 6.5},
            token=self.employee_token,
            description="Employee logs actual time spent on task"
        )
        return success

    def test_create_leave_request(self):
        """Test creating leave request"""
        # Create leave request for 7 days from now (meets 5-day advance requirement)
        start_date = datetime.now() + timedelta(days=7)
        end_date = start_date + timedelta(days=2)
        
        leave_data = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": "Personal leave",
            "leave_type": "casual"
        }
        
        success, response = self.run_test(
            "Create Leave Request",
            "POST",
            "leaves",
            200,
            data=leave_data,
            token=self.employee_token,
            description="Employee creates leave request (7 days advance)"
        )
        
        if success and 'id' in response:
            self.test_leave_id = response['id']
        
        return success

    def test_get_leave_requests(self):
        """Test getting leave requests"""
        success, response = self.run_test(
            "Get Leave Requests (Employee)",
            "GET",
            "leaves",
            200,
            token=self.employee_token,
            description="Employee gets their leave requests"
        )
        
        # Also test as admin
        success2, response2 = self.run_test(
            "Get Leave Requests (Admin)",
            "GET",
            "leaves",
            200,
            token=self.admin_token,
            description="Admin gets all leave requests"
        )
        
        return success and success2

    def test_get_pending_leaves(self):
        """Test getting pending leave requests (admin only)"""
        success, response = self.run_test(
            "Get Pending Leaves",
            "GET",
            "leaves/pending",
            200,
            token=self.admin_token,
            description="Admin gets pending leave requests"
        )
        return success

    def test_approve_leave(self):
        """Test approving leave request"""
        if not self.test_leave_id:
            print("❌ Skipping leave approval - no leave ID available")
            return False
            
        success, response = self.run_test(
            "Approve Leave Request",
            "PATCH",
            f"leaves/{self.test_leave_id}/approve",
            200,
            token=self.admin_token,
            description="Admin approves leave request"
        )
        return success

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "invalid"},
            description="Test login with invalid credentials (should fail)"
        )
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoint"""
        success, response = self.run_test(
            "Unauthorized Access",
            "GET",
            "auth/me",
            401,
            description="Access protected endpoint without token (should fail)"
        )
        return success

    def test_employee_admin_access(self):
        """Test employee trying to access admin-only endpoint"""
        success, response = self.run_test(
            "Employee Admin Access",
            "GET",
            "users",
            403,
            token=self.employee_token,
            description="Employee tries to access admin endpoint (should fail)"
        )
        return success

def main():
    print("🚀 Starting Team Management Dashboard API Tests")
    print("=" * 60)
    
    tester = TeamManagementAPITester()
    
    # Authentication Tests
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    tester.test_get_current_user()
    tester.test_invalid_login()
    tester.test_unauthorized_access()
    
    # User Management Tests
    print("\n👥 USER MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_create_employee_user()
    tester.test_get_users()
    tester.test_employee_admin_access()
    
    # Office Location Tests
    print("\n🏢 OFFICE LOCATION TESTS")
    print("-" * 30)
    tester.test_create_office_location()
    tester.test_get_office_locations()
    
    # Attendance Tests
    print("\n⏰ ATTENDANCE TESTS")
    print("-" * 30)
    tester.test_attendance_check_in()
    tester.test_get_today_attendance()
    tester.test_attendance_check_out()
    
    # Task Management Tests
    print("\n📝 TASK MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_create_task()
    tester.test_get_tasks()
    tester.test_update_task_status()
    tester.test_log_task_time()
    
    # Leave Management Tests
    print("\n🏖️ LEAVE MANAGEMENT TESTS")
    print("-" * 30)
    tester.test_create_leave_request()
    tester.test_get_leave_requests()
    tester.test_get_pending_leaves()
    tester.test_approve_leave()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())