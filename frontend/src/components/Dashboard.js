import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Navigation from "./Navigation";
import axios from "axios";
import { toast } from "sonner";
import { 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  Calendar,
  TrendingUp,
  Bell,
  Activity
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceStatus();
    getCurrentLocation();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceStatus(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Unable to get location. Please enable location services.");
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
      setLocationLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!location) {
      toast.error("Location not available. Please enable location services.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/attendance/check-in`,
        location,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Checked in successfully!");
      fetchAttendanceStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Check-in failed");
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!location) {
      toast.error("Location not available. Please enable location services.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/attendance/check-out`,
        location,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Checked out successfully! Total hours: ${response.data.total_hours}`);
      fetchAttendanceStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Check-out failed");
    }
    setLoading(false);
  };

  const formatTime = (timeString) => {
    if (!timeString) return "--:--";
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    if (!attendanceStatus) return "bg-slate-100 text-slate-600";
    if (attendanceStatus.checked_in && !attendanceStatus.checked_out) {
      return "bg-green-100 text-green-700";
    }
    if (attendanceStatus.checked_out) {
      return "bg-blue-100 text-blue-700";
    }
    return "bg-slate-100 text-slate-600";
  };

  const getStatusText = () => {
    if (!attendanceStatus) return "Not checked in";
    if (attendanceStatus.checked_in && !attendanceStatus.checked_out) {
      return "Checked in";
    }
    if (attendanceStatus.checked_out) {
      return "Checked out";
    }
    return "Not checked in";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="dashboard-header mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.full_name}!
              </h1>
              <p className="text-indigo-100 text-lg">{formatDate()}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Badge className={`${getStatusColor()} px-4 py-2 text-sm font-medium`}>
                <Activity className="w-4 h-4 mr-2" />
                {getStatusText()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-hover border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Check In</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceStatus?.check_in_time ? formatTime(attendanceStatus.check_in_time) : "--:--"}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
              {!attendanceStatus?.checked_in && (
                <Button 
                  onClick={handleCheckIn}
                  disabled={loading || locationLoading}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Checking in..." : "Check In"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Check Out</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceStatus?.check_out_time ? formatTime(attendanceStatus.check_out_time) : "--:--"}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
              </div>
              {attendanceStatus?.checked_in && !attendanceStatus?.checked_out && (
                <Button 
                  onClick={handleCheckOut}
                  disabled={loading || locationLoading}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                >
                  {loading ? "Checking out..." : "Check Out"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {attendanceStatus?.total_hours ? `${attendanceStatus.total_hours.toFixed(1)}h` : "--"}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Location</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {attendanceStatus?.work_location ? 
                      attendanceStatus.work_location.charAt(0).toUpperCase() + attendanceStatus.work_location.slice(1) 
                      : "Unknown"
                    }
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              {locationLoading && (
                <div className="mt-2 text-xs text-slate-500">
                  Getting location...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-12 flex-col p-4 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => window.location.href = '/attendance'}
                >
                  <Calendar className="w-5 h-5 mb-1 text-indigo-600" />
                  <span className="text-sm">Attendance</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-12 flex-col p-4 hover:bg-green-50 hover:border-green-300"
                  onClick={() => window.location.href = '/tasks'}
                >
                  <CheckCircle className="w-5 h-5 mb-1 text-green-600" />
                  <span className="text-sm">Tasks</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-12 flex-col p-4 hover:bg-orange-50 hover:border-orange-300"
                  onClick={() => window.location.href = '/leaves'}
                >
                  <Calendar className="w-5 h-5 mb-1 text-orange-600" />
                  <span className="text-sm">Leave</span>
                </Button>
                
                {user?.role === 'admin' && (
                  <Button 
                    variant="outline" 
                    className="h-12 flex-col p-4 hover:bg-purple-50 hover:border-purple-300"
                    onClick={() => window.location.href = '/admin'}
                  >
                    <Users className="w-5 h-5 mb-1 text-purple-600" />
                    <span className="text-sm">Admin</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <Badge className={getStatusColor()}>
                    {getStatusText()}
                  </Badge>
                </div>
                
                {attendanceStatus?.work_location && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Work Location</span>
                    <span className="text-sm font-semibold capitalize">
                      {attendanceStatus.work_location}
                    </span>
                  </div>
                )}
                
                {attendanceStatus?.total_hours && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Hours Worked</span>
                    <span className="text-sm font-semibold">
                      {attendanceStatus.total_hours.toFixed(1)} hours
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;