import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Users, 
  Package, 
  Calendar, 
  Activity,
  Printer,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminOverview = () => {
  // --- DASHBOARD STATE ---
  const [data, setData] = useState({
    stats: { totalUsers: 0, pendingRequests: 0, totalInventory: 0, pendingLabSessions: 0 },
    expiringItems: [],
    activityLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- REPORT STATE ---
  const [reportConfig, setReportConfig] = useState({ type: "activity", period: "month" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // FETCH MAIN DASHBOARD DATA
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/dashboard`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // FETCH REPORT & GENERATE PDF
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/reports?type=${reportConfig.type}&period=${reportConfig.period}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to generate report");
      
      const result = await response.json();
      
      // Generate the PDF instead of using window.print()
      generatePDF(result);
      
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- jsPDF GENERATOR FUNCTION ---
  const generatePDF = (reportData) => {
    const doc = new jsPDF();
    const isActivity = reportData.type === 'activity';
    const startDate = new Date(reportData.startDate).toLocaleDateString();
    const endDate = new Date(reportData.endDate).toLocaleDateString();

    // 1. Add Formal Header
    doc.setFontSize(16);
    doc.setFont("times new roman", "bold");
    doc.text("University Science Laboratory", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const title = isActivity ? "Material Usage & Activity Log" : "Official Inventory Status Report";
    doc.text(title, 105, 28, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reporting Period: ${startDate} to ${endDate}`, 105, 34, { align: "center" });

    // 2. Define Table Columns and Rows
    let tableColumns = [];
    let tableRows = [];

    if (isActivity) {
      tableColumns = ["Date", "User Name", "Section", "Item Requested", "Status"];
      tableRows = reportData.reportData.map(row => [
        new Date(row.createdAt).toLocaleDateString(),
        row.student?.name || 'N/A',
        row.student?.section || 'N/A',
        `${row.inventory?.name || 'Unknown'} (Qty: ${row.amountRequested})`,
        row.status
      ]);
    } else {
      tableColumns = ["Control #", "Item Name", "Category", "Qty / Unit", "Expiration Date"];
      tableRows = reportData.reportData.map(row => [
        row.controlNumber,
        row.Inventory?.name || 'Unknown',
        row.Inventory?.category || 'Unknown',
        `${row.quantity} ${row.Inventory?.unit || ''}`,
        row.expirationDate ? new Date(row.expirationDate).toLocaleDateString() : 'N/A'
      ]);
    }

    // 3. Add Table to Document
    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }, 
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // 4. Add Signature Block (using doc.lastAutoTable.finalY to place it after the table)
    const finalY = doc.lastAutoTable.finalY + 30; // 30 units of padding below the table
    
    // Ensure we don't draw signatures off the page
    if (finalY > 250) {
      doc.addPage();
    }

    doc.setFontSize(10);
    doc.setTextColor(0);
    
    // Left Signature
    doc.line(30, finalY, 80, finalY); // Line
    doc.setFont("helvetica", "bold");
    doc.text("Laboratory Custodian", 55, finalY + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Prepared By", 55, finalY + 11, { align: "center" });

    // Right Signature
    doc.line(130, finalY, 180, finalY); // Line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Department Head", 155, finalY + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Approved By", 155, finalY + 11, { align: "center" });

    // 5. Save the Document
    doc.save(`Lab_Report_${reportData.type}_${startDate}.pdf`);
  };

  if (error) return <div className="p-8 text-destructive font-semibold">Error: {error}</div>;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER & REPORT MODAL */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Laboratory & Inventory Management System</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Printer size={18} />
              Generate Official Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Laboratory Report</DialogTitle>
              <DialogDescription>
                Select parameters to generate an official PDF document.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select 
                  value={reportConfig.type} 
                  onValueChange={(val) => setReportConfig({ ...reportConfig, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Material Request & Activity Log</SelectItem>
                    <SelectItem value="inventory">Comprehensive Inventory Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Time Period</label>
                <Select 
                  value={reportConfig.period} 
                  onValueChange={(val) => setReportConfig({ ...reportConfig, period: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? "Generating PDF..." : "Download PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={data.stats.totalUsers} 
          icon={<Users size={20} className="text-blue-500" />} 
          loading={loading} 
        />
        <StatCard 
          title="Total Inventory" 
          value={data.stats.totalInventory} 
          icon={<Package size={20} className="text-emerald-500" />} 
          loading={loading} 
        />
        <StatCard 
          title="Pending Requests" 
          value={data.stats.pendingRequests} 
          icon={<FileText size={20} className="text-amber-500" />} 
          alert={data.stats.pendingRequests > 0}
          loading={loading} 
        />
        <StatCard 
          title="Pending Labs" 
          value={data.stats.pendingLabSessions} 
          icon={<Calendar size={20} className="text-purple-500" />} 
          alert={data.stats.pendingLabSessions > 0}
          loading={loading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* EXPIRING CHEMICALS ALERT TABLE */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              <CardTitle>Expiring Chemicals (Next 30 Days)</CardTitle>
            </div>
            {!loading && (
              <Badge variant="destructive">
                {data.expiringItems.length} Warnings
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Control #</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expiringItems.length > 0 ? (
                      data.expiringItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.controlNumber}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-destructive font-medium">
                            {new Date(item.expirationDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                          No expiring items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY LOGS */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4 flex flex-row items-center gap-2">
            <Activity className="text-muted-foreground h-5 w-5" />
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {data.activityLogs.length > 0 ? (
                    data.activityLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-primary/50 pl-4 py-1">
                        <p className="text-sm font-medium leading-none">{log.action}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {log.user} • {formatDistanceToNow(new Date(log.date), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, alert, loading }) => (
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-16 mt-1" />
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {alert && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminOverview;