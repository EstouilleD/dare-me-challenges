import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Flag, Users, FileText, UserX, BarChart3, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";
import HeaderLogo from "@/components/HeaderLogo";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminReports from "@/components/admin/AdminReports";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminContent from "@/components/admin/AdminContent";
import AdminDeletedUsers from "@/components/admin/AdminDeletedUsers";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const { headerClass } = useAutoHideHeader();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className={headerClass("sticky top-0 z-10 bg-gradient-primary border-b shadow-card")}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 relative">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6" />
                Admin Dashboard
              </h1>
            </div>
            <HeaderLogo />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <UserX className="h-4 w-4" />
              <span className="hidden sm:inline">Deleted</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
          <TabsContent value="reports">
            <AdminReports />
          </TabsContent>
          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
          <TabsContent value="content">
            <AdminContent />
          </TabsContent>
          <TabsContent value="deleted">
            <AdminDeletedUsers />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
