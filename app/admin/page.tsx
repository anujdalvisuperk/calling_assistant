'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Phone, Upload, LogOut, BarChart3 } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      // 1. Verify User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      // 2. Fetch Stats from Supabase
      // (Note: This might show 0 initially until we create the tables)
      const { count: pending } = await supabase
        .from('call_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      const { count: completed } = await supabase
        .from('call_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      setStats({
        pending: pending || 0,
        completed: completed || 0,
        total: (pending || 0) + (completed || 0),
      });
      setLoading(false);
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading)
    return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">
            Admin Control Center
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-slate-700">Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase">
              Pending Calls
            </p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase">
              Completed Calls
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {stats.completed}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase">
              Total Database
            </p>
            <p className="text-3xl font-bold text-slate-800 mt-2">
              {stats.total}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <h3 className="text-lg font-semibold mb-4 text-slate-700">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Import Button */}
          <Link
            href="/admin/import"
            className="group block p-6 bg-white border rounded-xl hover:border-blue-500 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">
                  Import Contacts (CSV)
                </h4>
                <p className="text-sm text-slate-500">
                  Upload phone numbers and assign them to telecallers.
                </p>
              </div>
            </div>
          </Link>

          {/* Manage Users (Placeholder) */}
          <div className="group block p-6 bg-white border rounded-xl opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Manage Team</h4>
                <p className="text-sm text-slate-500">
                  Add or remove telecaller accounts (Coming Soon).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
