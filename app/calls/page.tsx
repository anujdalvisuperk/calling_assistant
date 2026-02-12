'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendWatiMessage } from '@/app/actions'; // We import our new action
import {
  Phone,
  Clock,
  XCircle,
  CheckCircle,
  Save,
  Calendar,
  MessageCircle,
} from 'lucide-react';

export default function CallsPage() {
  const supabase = createClient();
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Call Form State
  const [outcome, setOutcome] = useState('connected');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(0);
  const [callResult, setCallResult] = useState('neutral'); // positive, neutral, etc
  const [callbackTime, setCallbackTime] = useState('');

  useEffect(() => {
    // 1. Get current logged in user
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNextTask(user.id);
      }
    };
    init();
  }, []);

  const fetchNextTask = async (uid: string) => {
    setLoading(true);
    // 2. Find oldest 'pending' task assigned to this user
    // that is scheduled for NOW or the PAST
    const { data } = await supabase
      .from('call_tasks')
      .select('*')
      .eq('assigned_to', uid)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString()) // scheduled_at <= Now
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();

    if (data) {
      setCurrentTask(data);
    } else {
      setCurrentTask(null);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!currentTask || !userId) return;
    setLoading(true);

    let nextStatus = 'completed';
    let nextSchedule = null;
    let whatsappSent = false;

    // A. Determine Next Steps based on button clicked
    if (outcome === 'busy' || outcome === 'not_picking') {
      nextStatus = 'pending'; // Put back in queue
      // Reschedule for 30 mins later
      const t = new Date();
      t.setMinutes(t.getMinutes() + 30);
      nextSchedule = t.toISOString();
    } else if (outcome === 'scheduled_callback') {
      nextStatus = 'pending';
      nextSchedule = callbackTime ? new Date(callbackTime).toISOString() : null;
    }

    // B. Send WhatsApp (Only if connected)
    if (outcome === 'connected') {
      const res = await sendWatiMessage(currentTask.phone_number);
      if (res.success) whatsappSent = true;
    }

    // C. Save Call Log
    await supabase.from('call_logs').insert({
      task_id: currentTask.id,
      caller_id: userId,
      phone_number: currentTask.phone_number,
      call_status: outcome,
      call_outcome: outcome === 'connected' ? callResult : null,
      call_duration_mins: duration,
      comments: notes,
      scheduled_callback_at: nextSchedule,
      whatsapp_sent: whatsappSent,
    });

    // D. Update the Task
    await supabase
      .from('call_tasks')
      .update({
        status: nextStatus,
        scheduled_at: nextSchedule || currentTask.scheduled_at, // Only change time if we calculated a new one
        attempt_count: currentTask.attempt_count + 1,
      })
      .eq('id', currentTask.id);

    // E. Reset and Get Next
    setNotes('');
    setDuration(0);
    setOutcome('connected');
    fetchNextTask(userId);
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse">Finding next call...</div>
    );

  // Empty State
  if (!currentTask) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-2xl shadow-sm text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">All Caught Up!</h2>
          <p className="text-slate-500 mt-2">
            No pending calls in your queue right now.
          </p>
          <button
            onClick={() => userId && fetchNextTask(userId)}
            className="mt-6 text-blue-600 font-semibold hover:underline"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen">
      {/* Top Card: Phone Number */}
      <div className="bg-white rounded-2xl shadow-sm border p-8 mb-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
          Current Task
        </p>
        <h1 className="text-4xl font-mono font-bold text-slate-900 flex items-center justify-center gap-3">
          <Phone className="text-blue-600" size={32} />
          {currentTask.phone_number}
        </h1>
        {currentTask.name && (
          <p className="text-slate-500 mt-2 text-lg">{currentTask.name}</p>
        )}
        <p className="text-xs text-slate-400 mt-4">
          Attempts: {currentTask.attempt_count}
        </p>
      </div>

      {/* Action Area */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">What happened?</h3>

        {/* Outcome Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setOutcome('connected')}
            className={`p-3 rounded-lg border text-sm font-medium transition ${
              outcome === 'connected'
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'hover:bg-slate-50'
            }`}
          >
            Connected
          </button>
          <button
            onClick={() => setOutcome('not_picking')}
            className={`p-3 rounded-lg border text-sm font-medium transition ${
              outcome === 'not_picking'
                ? 'bg-orange-50 border-orange-500 text-orange-700'
                : 'hover:bg-slate-50'
            }`}
          >
            Not Picking
          </button>
          <button
            onClick={() => setOutcome('busy')}
            className={`p-3 rounded-lg border text-sm font-medium transition ${
              outcome === 'busy'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'hover:bg-slate-50'
            }`}
          >
            Busy / Cut
          </button>
          <button
            onClick={() => setOutcome('scheduled_callback')}
            className={`p-3 rounded-lg border text-sm font-medium transition ${
              outcome === 'scheduled_callback'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'hover:bg-slate-50'
            }`}
          >
            Call Later
          </button>
          <button
            onClick={() => setOutcome('wrong_number')}
            className={`p-3 rounded-lg border text-sm font-medium transition ${
              outcome === 'wrong_number'
                ? 'bg-slate-100 border-slate-500 text-slate-700'
                : 'hover:bg-slate-50'
            }`}
          >
            Wrong #
          </button>
        </div>

        {/* Detailed Form (Only if Connected) */}
        {outcome === 'connected' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Result
                  </label>
                  <select
                    value={callResult}
                    onChange={(e) => setCallResult(e.target.value)}
                    className="w-full mt-1 p-2 border rounded"
                  >
                    <option value="positive">Positive / Interested</option>
                    <option value="neutral">Neutral</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                  rows={2}
                  placeholder="Type summary here..."
                ></textarea>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-3 rounded">
              <MessageCircle size={16} /> WhatsApp will be sent automatically
              upon saving.
            </div>
          </div>
        )}

        {/* Date Picker (Only if Call Later) */}
        {outcome === 'scheduled_callback' && (
          <div className="mb-4">
            <label className="text-sm font-bold block mb-1">
              Select Callback Time
            </label>
            <input
              type="datetime-local"
              className="w-full border p-2 rounded"
              onChange={(e) => setCallbackTime(e.target.value)}
            />
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg"
        >
          <Save size={20} />
          {outcome === 'connected' ? 'Save & Send WhatsApp' : 'Update Status'}
        </button>
      </div>
    </div>
  );
}
