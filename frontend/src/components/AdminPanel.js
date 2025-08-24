import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import Navigation from "./Navigation";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, 
  MapPin, 
  Plus, 
  Shield,
  Clock,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Settings
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  
  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  
  // Form states
  const [userForm, setUserForm] = useState({
    email: "",
    username: "",
    full_name: "",
    password: "",
    role: "employee"
  });
  
  const [locationForm, setLocationForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: "100"
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, locationsRes, leavesRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/office-locations`),
        axios.get(`${API}/leaves/pending`, { headers })
      ]);
      
      setUsers(usersRes.data);
      setOfficeLocations(locationsRes.data);
      setPendingLeaves(leavesRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleUserInputChange = (e) => {
    setUserForm({
      ...userForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLocationInputChange = (e) => {
    setLocationForm({
      ...locationForm,
      [e.target.name]: e.target.value
    });
  };

  const createUser = async (e) => {
    e.preventDefault();
    
    if (!userForm.email || !userForm.username || !userForm.full_name || !userForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/auth/register`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("User created successfully!");
      setUserForm({
        email: "",
        username: "",
        full_name: "",
        password: "",
        role: "employee"
      });
      setUserDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create user");
    }
  };

  const createOfficeLocation = async (e) => {
    e.preventDefault();
    
    if (!locationForm.name || !locationForm.latitude || !locationForm.longitude) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const locationData = {
        ...locationForm,
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        radius_meters: parseInt(locationForm.radius_meters)
      };

      await axios.post(`${API}/office-locations`, locationData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Office location created successfully!");
      setLocationForm({
        name: "",
        latitude: "",
        longitude: "",
        radius_meters: "100"
      });
      setLocationDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create office location");
    }
  };

  const approveLeave = async (leaveId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/leaves/${leaveId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Leave request approved!");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve leave request");
    }
  };

  const rejectLeave = async (leaveId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/leaves/${leaveId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Leave request rejected!");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject leave request");
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationForm({
            ...locationForm,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          toast.success("Location captured!");
        },
        (error) => {
          toast.error("Unable to get current location");
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600">Access Denied</h2>
            <p className="text-slate-500">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Admin Panel
          </h1>
          <p className="text-slate-600">
            Manage users, locations, and monitor team activities
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Office Locations</p>
                  <p className="text-2xl font-bold text-slate-900">{officeLocations.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Pending Leaves</p>
                  <p className="text-2xl font-bold text-slate-900">{pendingLeaves.length}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Active Employees</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {users.filter(u => u.is_active && u.role === 'employee').length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="locations">Office Locations</TabsTrigger>
            <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">User Management</h2>
              
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createUser} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={userForm.email}
                        onChange={handleUserInputChange}
                        placeholder="user@company.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        name="username"
                        value={userForm.username}
                        onChange={handleUserInputChange}
                        placeholder="username"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={userForm.full_name}
                        onChange={handleUserInputChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={userForm.password}
                        onChange={handleUserInputChange}
                        placeholder="Password"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={userForm.role} onValueChange={(value) => setUserForm({...userForm, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                        Create User
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{user.full_name}</h3>
                          <p className="text-sm text-slate-600">@{user.username} • {user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                          {user.role}
                        </Badge>
                        <Badge className={user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Office Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Office Locations</h2>
              
              <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Office Location</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createOfficeLocation} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Location Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={locationForm.name}
                        onChange={handleLocationInputChange}
                        placeholder="Main Office"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latitude">Latitude *</Label>
                        <Input
                          id="latitude"
                          name="latitude"
                          type="number"
                          step="any"
                          value={locationForm.latitude}
                          onChange={handleLocationInputChange}
                          placeholder="40.7128"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="longitude">Longitude *</Label>
                        <Input
                          id="longitude"
                          name="longitude"
                          type="number"
                          step="any"
                          value={locationForm.longitude}
                          onChange={handleLocationInputChange}
                          placeholder="-74.0060"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="radius_meters">Radius (meters)</Label>
                      <Input
                        id="radius_meters"
                        name="radius_meters"
                        type="number"
                        min="10"
                        value={locationForm.radius_meters}
                        onChange={handleLocationInputChange}
                        placeholder="100"
                      />
                    </div>

                    <Button type="button" onClick={getCurrentLocation} variant="outline" className="w-full">
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </Button>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setLocationDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                        Add Location
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {officeLocations.map((location) => (
                <Card key={location.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-slate-800 mb-2">{location.name}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>Latitude: {location.latitude.toFixed(6)}</div>
                          <div>Longitude: {location.longitude.toFixed(6)}</div>
                          <div>Radius: {location.radius_meters}m</div>
                          <div>Created: {formatDate(location.created_at)}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <MapPin className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leaves" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800">Pending Leave Requests</h2>
            </div>

            <div className="space-y-4">
              {pendingLeaves.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">No pending requests</h3>
                      <p className="text-slate-500">All leave requests have been processed!</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                pendingLeaves.map((leave) => (
                  <Card key={leave.id} className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge className="bg-yellow-100 text-yellow-700">
                              Pending Approval
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700">
                              {leave.leave_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-slate-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span>
                                {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>
                                {calculateDays(leave.start_date, leave.end_date)} day(s)
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              <span>Applied on: {formatDate(leave.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-medium text-slate-800 mb-2">Reason:</h4>
                            <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg">
                              {leave.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveLeave(leave.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectLeave(leave.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;