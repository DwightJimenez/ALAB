import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Users,
  Package,
  Calendar,
  Activity,
  Printer,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

// --- PROFESSIONAL PDF GENERATOR ---
const generatePDF = (reportData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });
  const type = reportData.type;
  const startDate = new Date(reportData.startDate).toLocaleDateString();
  const endDate = new Date(reportData.endDate).toLocaleDateString();

  // 1. Formal Institutional Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Donsol National Comprehensive High School", 105, 15, { align: "center" });



  doc.setLineWidth(0.5);
  doc.line(15, 24, 195, 24);

  // Report Title Subheader
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  let title = "Official Laboratory Report";
  if (type === "activity")
    title = "Laboratory Utilization & Material Activity Log";
  if (type === "consumables")
    title = "Chemical & Reagent Expiration Status Report";
  if (type === "damages") title = "Equipment Discrepancy & Maintenance Log";

  doc.text(title, 105, 32, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Reporting Period: ${startDate} — ${endDate} | Status: Official Record`,
    105,
    38,
    {
      align: "center",
    },
  );

  // 2. Dynamic Columns & Rows Building
  let tableColumns = [];
  let tableRows = [];

  if (type === "activity") {
    tableColumns = [
      "Date",
      "Student Name",
      "Section",
      "Item & Quantity Requested",
      "Status",
    ];
    tableRows = reportData.reportData.map((row) => [
      new Date(row.createdAt).toLocaleDateString(),
      row.student?.name || "N/A",
      row.student?.section || "Unassigned",
      `${row.inventory?.name || "Unknown"} (${row.amountRequested} ${row.inventory?.unit || "pcs"})`,
      row.status,
    ]);
  } else if (type === "consumables") {
    tableColumns = [
      "Control #",
      "Chemical Name",
      "Category",
      "Current Stock / Vol",
      "Expiration Date",
    ];
    tableRows = reportData.reportData.map((row) => [
      row.controlNumber,
      row.Inventory?.name || "Unknown",
      row.Inventory?.category || "Chemical",
      `${row.quantity} ${row.Inventory?.unit || "ml"}`,
      row.expirationDate
        ? new Date(row.expirationDate).toLocaleDateString()
        : "No Expiry Set",
    ]);
  } else {
    tableColumns = [
      "Return Date",
      "Borrower",
      "Item Name",
      "Control #",
      "Condition Notes",
    ];
    tableRows = reportData.reportData.map((row) => [
      new Date(row.updatedAt).toLocaleDateString(),
      row.student?.name || "N/A",
      row.inventory?.name || "Unknown",
      row.assignedControlNumbers?.[0] || "N/A",
      row.conditionNotes || "Evaluated Safe",
    ]);
  }

  // 3. Render AutoTable
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 45,
    theme: "striped",
    headStyles: {
      fillColor: [20, 35, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 15, right: 15 },
  });

  // 4. Professional 3-Column Signature Block
  let finalY = doc.lastAutoTable.finalY + 25;
  if (finalY > 240) {
    doc.addPage();
    finalY = 30;
  }

  doc.setFontSize(9);
  doc.setTextColor(0);

  const colWidth = 55;
  const leftMargin = 15;

  // Signer 1: Prepared By
  doc.line(leftMargin, finalY, leftMargin + colWidth, finalY);
  doc.setFont("helvetica", "bold");
  doc.text("Laboratory Custodian", leftMargin + colWidth / 2, finalY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Prepared By", leftMargin + colWidth / 2, finalY + 9, {
    align: "center",
  });

  // Signer 2: Checked By
  const midX = leftMargin + colWidth + 10;
  doc.line(midX, finalY, midX + colWidth, finalY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Science Department Chair", midX + colWidth / 2, finalY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Checked & Verified", midX + colWidth / 2, finalY + 9, {
    align: "center",
  });

  // Signer 3: Approved By
  const rightX = midX + colWidth + 10;
  doc.line(rightX, finalY, rightX + colWidth, finalY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Campus Administrator", rightX + colWidth / 2, finalY + 5, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Approved By", rightX + colWidth / 2, finalY + 9, {
    align: "center",
  });

  // 5. Save Document
  doc.save(
    `Lab_Report_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
};

const AdminOverview = () => {
  const [data, setData] = useState({
    stats: {
      totalUsers: 0,
      pendingRequests: 0,
      totalInventory: 0,
      pendingLabSessions: 0,
    },
    expiringItems: [],
    activityLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- REPORT STATE ---
  const [reportConfig, setReportConfig] = useState({
    type: "activity",
    period: "month",
    startDate: "",
    endDate: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/dashboard`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [API_URL]);

  const handleGenerateReport = async () => {
    if (
      reportConfig.period === "custom" &&
      (!reportConfig.startDate || !reportConfig.endDate)
    ) {
      toast.error(
        "Please provide both a start and end date for the custom range.",
      );
      return;
    }

    setIsGenerating(true);
    try {
      let queryUrl = `${API_URL}/api/admin/reports?type=${reportConfig.type}&period=${reportConfig.period}`;
      if (reportConfig.period === "custom") {
        queryUrl += `&startDate=${reportConfig.startDate}&endDate=${reportConfig.endDate}`;
      }

      const response = await fetch(queryUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok)
        throw new Error("Failed to pull report data from server.");

      const result = await response.json();
      generatePDF(result);

      toast.success("Official report generated successfully.");
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err.message || "An error occurred while generating the report.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className='p-8 max-w-7xl mx-auto'>
        <Card className='border-destructive bg-destructive/10'>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3 text-destructive font-semibold'>
              <AlertTriangle />
              <p>Dashboard Error: {error}</p>
            </div>
            <Button
              variant='outline'
              className='mt-4'
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6 max-w-7xl mx-auto space-y-6'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Admin Overview</h1>
          <p className='text-muted-foreground'>
            Laboratory & Inventory Management System
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className='gap-2 shadow-sm bg-navy hover:bg-blue'>
              <Printer size={18} />
              Generate Official Report
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[450px] bg-white'>
            <DialogHeader>
              <DialogTitle>Generate Laboratory Report</DialogTitle>
              <DialogDescription>
                Select standard compliance parameters or set a custom timeframe.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>
                  Standard Report Type
                </label>
                <Select
                  value={reportConfig.type}
                  onValueChange={(val) =>
                    setReportConfig({ ...reportConfig, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value='activity'>
                      📊 Lab Utilization & Material Log
                    </SelectItem>
                    <SelectItem value='consumables'>
                      🧪 Chemical & Reagent Expiration Report
                    </SelectItem>
                    <SelectItem value='damages'>
                      ⚠️ Equipment Discrepancy & Damage Log
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Reporting Period</label>
                <Select
                  value={reportConfig.period}
                  onValueChange={(val) =>
                    setReportConfig({ ...reportConfig, period: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select period' />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value='month'>Past 30 Days</SelectItem>
                    <SelectItem value='year'>Past 12 Months</SelectItem>
                    <SelectItem value='custom'>Custom Date Range...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CUSTOM DATE RANGE PICKERS */}
              {reportConfig.period === "custom" && (
                <div className='grid grid-cols-2 gap-3 pt-2 animate-in fade-in zoom-in-95 duration-200'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600'>
                      Start Date
                    </label>
                    <Input
                      type='date'
                      value={reportConfig.startDate}
                      onChange={(e) =>
                        setReportConfig({
                          ...reportConfig,
                          startDate: e.target.value,
                        })
                      }
                      className='bg-slate-50'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600'>
                      End Date
                    </label>
                    <Input
                      type='date'
                      value={reportConfig.endDate}
                      onChange={(e) =>
                        setReportConfig({
                          ...reportConfig,
                          endDate: e.target.value,
                        })
                      }
                      className='bg-slate-50'
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className='bg-navy hover:bg-blue text-white'
              >
                {isGenerating
                  ? "Compiling Document..."
                  : "Download Official PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS GRID */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          title='Total Users'
          value={data.stats.totalUsers}
          icon={<Users size={20} className='text-blue-500' />}
          loading={loading}
        />
        <StatCard
          title='Pending Requests'
          value={data.stats.pendingRequests}
          icon={<Clock size={20} className='text-amber-500' />}
          alert={data.stats.pendingRequests > 0}
          loading={loading}
        />
        <StatCard
          title='Total Inventory Items'
          value={data.stats.totalInventory}
          icon={<Package size={20} className='text-emerald-500' />}
          loading={loading}
        />
        <StatCard
          title='Pending Lab Sessions'
          value={data.stats.pendingLabSessions}
          icon={<Calendar size={20} className='text-purple-500' />}
          alert={data.stats.pendingLabSessions > 0}
          loading={loading}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6'>
        {/* EXPIRING CHEMICALS ALERT TABLE */}
        <Card className='lg:col-span-2 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='text-destructive h-5 w-5' />
              <CardTitle>Expiring Chemicals (Next 30 Days)</CardTitle>
            </div>
            {!loading && data.expiringItems.length > 0 && (
              <Badge variant='destructive'>
                {data.expiringItems.length} Warnings
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>
            ) : (
              <div className='rounded-md border'>
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
                          <TableCell className='font-medium'>
                            {item.controlNumber}
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className='text-destructive font-medium'>
                            {new Date(item.expirationDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='text-center text-muted-foreground h-24'
                        >
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
        <Card className='shadow-sm'>
          <CardHeader className='pb-4 flex flex-row items-center gap-2'>
            <Activity className='text-muted-foreground h-5 w-5' />
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-4'>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className='flex flex-col gap-2'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className='h-[300px] pr-4'>
                <div className='space-y-4'>
                  {data.activityLogs.length > 0 ? (
                    data.activityLogs.map((log) => {
                      const logDate = parseISO(log.date);
                      const safeDate = isValid(logDate)
                        ? formatDistanceToNow(logDate, { addSuffix: true })
                        : "Unknown date";

                      return (
                        <div
                          key={log.id}
                          className='border-l-2 border-primary/50 pl-4 py-1'
                        >
                          <p className='text-sm font-medium leading-none'>
                            {log.action}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1.5'>
                            {log.user} • {safeDate}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className='text-sm text-muted-foreground text-center py-4'>
                      No recent activity.
                    </p>
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
  <Card className='shadow-sm'>
    <CardHeader className='flex flex-row items-center justify-between pb-2'>
      <CardTitle className='text-sm font-medium text-muted-foreground'>
        {title}
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className='h-8 w-16 mt-1' />
      ) : (
        <div className='flex items-center gap-2'>
          <div className='text-2xl font-bold'>{value}</div>
          {alert && (
            <span className='relative flex h-3 w-3'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75'></span>
              <span className='relative inline-flex rounded-full h-3 w-3 bg-destructive'></span>
            </span>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminOverview;
