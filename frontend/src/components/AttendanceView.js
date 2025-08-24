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
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
  Navigation as NavigationIcon
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AttendanceView = () => {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [officeLocations, setOfficeLocations] = useState([]);

  useEffect(() => {
    fetchAttendanceStatus();
    fetchOfficeLocations();
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
      toast.error("Failed to fetch attendance status");
    }
  };

  const fetchOfficeLocations = async () => {
    try {
      const response = await axios.get(`${API}/office-locations`);
      setOfficeLocations(response.data);
    } catch (error) {
      console.error("Error fetching office locations:", error);
    }
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };

          // Try to get address from coordinates
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=demo&limit=1`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              locationData.address = data.results[0].formatted;
            }
          } catch (error) {
            console.log("Could not get address:", error);
          }

          setLocation(locationData);
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
      if (response.data.is_in_office) {
        toast.success("You are within office premises!");
      } else {
        toast.info("You are working remotely today.");
      }
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

  const formatDateTime = (timeString) => {
    if (!timeString) return "Not recorded";
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const getLocationIcon = (workLocation) => {
    return workLocation === 'office' ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-orange-600" />
    );
  };

  const getLocationBadge = (workLocation) => {
    return workLocation === 'office' ? (
      <Badge className="bg-green-100 text-green-700">
        Office
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-700">
        Remote
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Attendance Tracking
          </h1>
          <p className="text-slate-600">
            Track your daily attendance and work location
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2 text-green-600" />
                Check In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {attendanceStatus?.check_in_time ? formatTime(attendanceStatus.check_in_time) : "--:--"}
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {attendanceStatus?.check_in_time ? 
                  formatDateTime(attendanceStatus.check_in_time) : 
                  "Not checked in today"
                }
              </p>
              {!attendanceStatus?.checked_in && (
                <Button 
                  onClick={handleCheckIn}
                  disabled={loading || locationLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking in...
                    </div>
                  ) : (
                    "Check In"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2 text-red-600" />
                Check Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {attendanceStatus?.check_out_time ? formatTime(attendanceStatus.check_out_time) : "--:--"}
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {attendanceStatus?.check_out_time ? 
                  formatDateTime(attendanceStatus.check_out_time) : 
                  "Not checked out yet"
                }
              </p>
              {attendanceStatus?.checked_in && !attendanceStatus?.checked_out && (
                <Button 
                  onClick={handleCheckOut}
                  disabled={loading || locationLoading}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking out...
                    </div>
                  ) : (
                    "Check Out"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Today's Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-2">
                {attendanceStatus?.total_hours ? 
                  `${attendanceStatus.total_hours.toFixed(1)}h` : 
                  "--.-h"
                }
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Total working hours
              </p>
              {attendanceStatus?.work_location && (
                <div className="flex items-center">
                  {getLocationIcon(attendanceStatus.work_location)}
                  <span className="ml-2">
                    {getLocationBadge(attendanceStatus.work_location)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
                  <span className="text-slate-600">Getting your location...</span>
                </div>
              ) : location ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Latitude</span>
                    <span className="text-sm font-mono">{location.latitude.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Longitude</span>
                    <span className="text-sm font-mono">{location.longitude.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Accuracy</span>
                    <span className="text-sm">{Math.round(location.accuracy)}m</span>
                  </div>
                  {location.address && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Address</span>
                      <p className="text-sm text-slate-800 mt-1">{location.address}</p>
                    </div>
                  )}
                  <Button 
                    onClick={getCurrentLocation}
                    variant="outline"
                    className="w-full"
                  >
                    <NavigationIcon className="w-4 h-4 mr-2" />
                    Refresh Location
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">Location not available</p>
                  <Button onClick={getCurrentLocation} variant="outline">
                    <NavigationIcon className="w-4 h-4 mr-2" />
                    Get Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Office Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {officeLocations.length > 0 ? (
                <div className="space-y-4">
                  {officeLocations.map((office) => (
                    <div key={office.id} className="p-4 border rounded-lg">
                      <h4 className="font-semibold text-slate-800 mb-2">{office.name}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>Lat: {office.latitude.toFixed(6)}</div>
                        <div>Lng: {office.longitude.toFixed(6)}</div>
                        <div className="col-span-2">Radius: {office.radius_meters}m</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    No office locations configured.
                    {user?.role === 'admin' && (
                      <span className="block mt-2">
                        Visit Admin panel to add office locations.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;