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
  Clock, 
  Calendar,
  Flag,
  User,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TaskView = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    assigned_to: "",
    estimated_hours: "",
    due_date: ""
  });

  useEffect(() => {
    fetchTasks();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.estimated_hours || !formData.due_date || !formData.assigned_to) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const taskData = {
        ...formData,
        estimated_hours: parseFloat(formData.estimated_hours),
        due_date: new Date(formData.due_date).toISOString()
      };

      await axios.post(`${API}/tasks`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Task created successfully!");
      setFormData({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        assigned_to: "",
        estimated_hours: "",
        due_date: ""
      });
      setDialogOpen(false);
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create task");
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/tasks/${taskId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Task status updated!");
      fetchTasks();
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const logTime = async (taskId, hours) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/tasks/${taskId}/time`, { actual_hours: hours }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Time logged successfully!");
      fetchTasks();
    } catch (error) {
      toast.error("Failed to log time");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getEfficiency = (estimated, actual) => {
    if (!actual) return null;
    const efficiency = (estimated / actual) * 100;
    return efficiency.toFixed(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && !tasks.find(t => t.due_date === dueDate)?.status === 'completed';
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
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Task Management
            </h1>
            <p className="text-slate-600">
              Create, track, and manage your tasks efficiently
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Task title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="e.g., Development"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="assigned_to">Assign To *</Label>
                  <Select value={formData.assigned_to} onValueChange={(value) => handleSelectChange('assigned_to', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.role === 'admin' ? (
                        users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name} ({u.username})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={user.id}>
                          {user.full_name} (Me)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimated_hours">Estimated Hours *</Label>
                    <Input
                      id="estimated_hours"
                      name="estimated_hours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.estimated_hours}
                      onChange={handleInputChange}
                      placeholder="8"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      name="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                    Create Task
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">No tasks yet</h3>
                  <p className="text-slate-500">Create your first task to get started!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="border-0 shadow-lg card-hover">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center">
                        {task.title}
                        {isOverdue(task.due_date) && (
                          <AlertCircle className="w-4 h-4 ml-2 text-red-500" />
                        )}
                      </CardTitle>
                      {task.description && (
                        <p className="text-slate-600 text-sm mb-3">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {task.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>Assigned to: {user?.id === task.assigned_to ? 'Me' : 'Other'}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Due: {formatDate(task.due_date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Est: {task.estimated_hours}h</span>
                      {task.actual_hours && (
                        <span className="ml-2">
                          | Actual: {task.actual_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {task.actual_hours && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Efficiency</span>
                        <span className={`font-semibold ${
                          getEfficiency(task.estimated_hours, task.actual_hours) >= 100 
                            ? 'text-green-600' 
                            : getEfficiency(task.estimated_hours, task.actual_hours) >= 80
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {getEfficiency(task.estimated_hours, task.actual_hours)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            getEfficiency(task.estimated_hours, task.actual_hours) >= 100 
                              ? 'bg-green-500' 
                              : getEfficiency(task.estimated_hours, task.actual_hours) >= 80
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(getEfficiency(task.estimated_hours, task.actual_hours), 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Task
                      </Button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const hours = prompt("Enter actual hours worked:");
                            if (hours && !isNaN(parseFloat(hours))) {
                              logTime(task.id, parseFloat(hours));
                            }
                          }}
                        >
                          Log Time
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskView;