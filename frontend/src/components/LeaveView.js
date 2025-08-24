import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import Navigation from "./Navigation";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LeaveView = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    leave_type: "casual"
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(response.data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const isValidLeaveDate = (startDate) => {
    const today = new Date();
    const leaveDate = new Date(startDate);
    const daysDifference = Math.ceil((leaveDate - today) / (1000 * 60 * 60 * 24));
    return daysDifference >= 5;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error("End date cannot be before start date");
      return;
    }

    if (!isValidLeaveDate(formData.start_date)) {
      toast.error("Leave must be applied at least 5 days in advance");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const leaveData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      await axios.post(`${API}/leaves`, leaveData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Leave request submitted successfully!");
      setFormData({
        start_date: "",
        end_date: "",
        reason: "",
        leave_type: "casual"
      });
      setDialogOpen(false);
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit leave request");
    }
  };

  const approveLeave = async (leaveId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/leaves/${leaveId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Leave request approved!");
      fetchLeaves();
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
      fetchLeaves();
    } catch (error) {
      toast.error("Failed to reject leave request");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case 'casual': return 'bg-blue-100 text-blue-700';
      case 'sick': return 'bg-red-100 text-red-700';
      case 'vacation': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    return minDate.toISOString().split('T')[0];
  };

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
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Leave Management
            </h1>
            <p className="text-slate-600">
              Apply for leave and track your requests
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      min={getMinDate()}
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Must be at least 5 days from today
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      min={formData.start_date || getMinDate()}
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      Duration: <span className="font-semibold">
                        {calculateDays(formData.start_date, formData.end_date)} day(s)
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="leave_type">Leave Type</Label>
                  <Select value={formData.leave_type} onValueChange={(value) => handleSelectChange('leave_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="Please provide a reason for your leave request"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leave Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Requests</p>
                  <p className="text-2xl font-bold text-slate-900">{leaves.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {leaves.filter(l => l.status === 'approved').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {leaves.filter(l => l.status === 'pending').length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {leaves.filter(l => l.status === 'rejected').length}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Requests */}
        <div className="space-y-6">
          {leaves.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">No leave requests</h3>
                  <p className="text-slate-500">Apply for your first leave request!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            leaves.map((leave) => (
              <Card key={leave.id} className="border-0 shadow-lg card-hover">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(leave.status)}>
                          {getStatusIcon(leave.status)}
                          <span className="ml-1 capitalize">{leave.status}</span>
                        </Badge>
                        <Badge className={getLeaveTypeColor(leave.leave_type)}>
                          {leave.leave_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
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
                          <User className="w-4 h-4 mr-2" />
                          <span>Applied on: {formatDate(leave.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="mb-4">
                    <h4 className="font-medium text-slate-800 mb-2">Reason:</h4>
                    <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg">
                      {leave.reason}
                    </p>
                  </div>

                  {user?.role === 'admin' && leave.status === 'pending' && (
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
                  )}

                  {leave.approved_by && leave.status === 'approved' && (
                    <div className="mt-3 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Approved by admin
                    </div>
                  )}

                  {leave.status === 'rejected' && (
                    <div className="mt-3 text-sm text-red-600">
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Request was rejected
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveView;