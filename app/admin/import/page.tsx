'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import {
  Upload,
  ArrowLeft,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Data
  const [team, setTeam] = useState<any[]>([]);
  // State for multi-selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getTeam() {
      const { data } = await supabase.from('profiles').select('id, email');
      if (data) {
        setTeam(data);
        // Default: Select EVERYONE
        setSelectedIds(data.map((u) => u.id));
      }
    }
    getTeam();
  }, []);

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      // Remove
      setSelectedIds(selectedIds.filter((uid) => uid !== id));
    } else {
      // Add
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === team.length) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(team.map((u) => u.id)); // Select all
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setPreview(results.data.slice(0, 5)),
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMsg('Preparing import...');

    if (selectedIds.length === 0) {
      alert('Please select at least one user to assign leads to!');
      setLoading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const tasksToInsert = [];
        const validRows = rows.filter((r) => r.phone_number);

        // 1. Filter the team to ONLY the selected people
        const activeSquad = team.filter((user) =>
          selectedIds.includes(user.id)
        );

        // 2. Distribute among the Squad
        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];

          // Round Robin Logic on the SUBSET of users
          const userObj = activeSquad[i % activeSquad.length];

          tasksToInsert.push({
            phone_number: row.phone_number,
            name: row.name || '',
            status: 'pending',
            assigned_to: userObj.id,
            created_at: new Date().toISOString(),
          });
        }

        setMsg(`Uploading ${tasksToInsert.length} tasks...`);

        const { error } = await supabase
          .from('call_tasks')
          .insert(tasksToInsert);

        if (error) {
          setMsg('Error: ' + error.message);
        } else {
          alert(
            `Success! Distributed ${tasksToInsert.length} leads among ${activeSquad.length} users.`
          );
          router.push('/admin');
        }
        setLoading(false);
      },
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-slate-50">
      <Link
        href="/admin"
        className="flex items-center text-slate-500 mb-6 hover:text-blue-600"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Upload className="text-blue-600" /> Import Contacts
        </h1>
        <p className="text-slate-500 mb-6">
          Upload CSV and assign leads to specific team members.
        </p>

        {/* STEP 1: Multi-Select Team */}
        <div className="mb-8 bg-slate-50 p-6 rounded-xl border">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users size={18} /> Assign to Team Squad ({selectedIds.length})
            </label>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              {selectedIds.length === team.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {team.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition select-none
                    ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                    }
                  `}
                >
                  {isSelected ? (
                    <CheckSquare size={20} className="text-blue-600" />
                  ) : (
                    <Square size={20} className="text-slate-300" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {user.email}
                  </span>
                </div>
              );
            })}

            {team.length === 0 && (
              <p className="text-sm text-slate-400 p-2">No users found.</p>
            )}
          </div>
        </div>

        {/* STEP 2: File Upload */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center hover:bg-slate-50 transition">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* STEP 3: Preview & Confirm */}
        {preview.length > 0 && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-semibold text-sm uppercase text-slate-500 mb-2">
              Preview
            </h3>
            <div className="overflow-x-auto border rounded-lg mb-4">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    {Object.keys(preview[0]).map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="p-3">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {msg && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded mb-4 flex gap-2">
                <AlertCircle size={18} />
                {msg}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : `Confirm & Distribute to ${selectedIds.length} Users`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
