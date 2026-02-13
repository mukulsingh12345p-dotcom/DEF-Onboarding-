
import React, { useState, useEffect } from 'react';
import { UserRole, UserSession, TrainingModule, UserProfile, UserProgress } from './types';
import { SCHOOL_LOCATIONS, AVAILABLE_ROLES } from './constants';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { Button } from './components/Button';
import { LogOut, GraduationCap, School, ArrowRight, ShieldCheck, UserPlus, RefreshCw, Briefcase, ArrowLeft, Info, Lock, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

// --- SEED Data (Used if DB is empty) ---
const SEED_USERS: UserProfile[] = [
  // --- SUPER ADMIN ---
  {
    name: "Central HR Manager",
    email: "hr",
    password: "hr",
    role: UserRole.ADMIN,
    schoolId: "Head Office",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'ALL'
  },
  // --- DEPARTMENT HEADS ---
  {
    name: "Academic Head (Principal)",
    email: "head_teacher",
    password: "123",
    role: UserRole.PRINCIPAL,
    schoolId: "Darshan Academy, Delhi",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'TEACHER'
  },
  {
    name: "Senior Accounts Officer",
    email: "head_accounts",
    password: "123",
    role: UserRole.ACCOUNTANT,
    schoolId: "Darshan Academy, Delhi",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'ACCOUNTANT'
  },
  {
    name: "Chief Security Officer",
    email: "head_security",
    password: "123",
    role: UserRole.SECURITY,
    schoolId: "Darshan Academy, Delhi",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'SECURITY'
  },
  {
    name: "Head of Housekeeping",
    email: "head_cleaning",
    password: "123",
    role: UserRole.CLEANING_STAFF,
    schoolId: "Darshan Academy, Delhi",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'CLEANING_STAFF'
  },
  {
    name: "Administrative Officer",
    email: "head_other",
    password: "123",
    role: UserRole.OTHER,
    schoolId: "Darshan Academy, Delhi",
    joinedAt: new Date().toISOString(),
    accountType: 'NEW',
    adminScope: 'OTHER'
  }
];

// --- Types for View State ---
type AppView = 'LANDING' | 'LOGIN_NEW' | 'LOGIN_REFRESHER' | 'LOGIN_ADMIN' | 'DASHBOARD';

// --- Main App Component ---

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<AppView>('LANDING');
  const [session, setSession] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true); // Kept for background status, but won't block UI

  // --- Data Fetching ---
  const fetchData = async () => {
      // Fetch Modules
      const { data: mods } = await supabase.from('modules').select('*');
      if (mods) setModules(mods.map(m => ({...m, questions: m.questions || []})));

      // Fetch Users
      const { data: usrs } = await supabase.from('users').select('*');
      if (usrs) {
          const mappedUsers = usrs.map(u => ({
              ...u,
              schoolId: u.school_id,
              joinedAt: u.joined_at,
              accountType: u.account_type,
              adminScope: u.admin_scope
          }));
          setUsers(mappedUsers);

          // Auto-Seed logic if DB is empty
          if (mappedUsers.length === 0) {
              console.log("Seeding Database...");
              for (const u of SEED_USERS) {
                  await supabase.from('users').insert({
                      email: u.email,
                      password: u.password,
                      name: u.name,
                      role: u.role,
                      school_id: u.schoolId,
                      account_type: u.accountType,
                      admin_scope: u.adminScope
                  });
              }
              // Re-fetch (background)
              const { data: newUsrs } = await supabase.from('users').select('*');
              if (newUsrs) setUsers(newUsrs.map(u => ({...u, schoolId: u.school_id, joinedAt: u.joined_at, accountType: u.account_type, adminScope: u.admin_scope})));
          }
      }

      // Fetch Progress
      const { data: prog } = await supabase.from('progress').select('*');
      if (prog) {
          setProgress(prog.map(p => ({
              userId: p.user_id,
              moduleId: p.module_id,
              videoWatched: p.video_watched,
              score: p.score,
              passed: p.passed,
              attempts: p.attempts
          })));
      }

      setLoading(false);
  };

  useEffect(() => {
      fetchData();
  }, []);

  // --- Actions ---

  const handleStaffLogin = async (loginId: string, pass: string, role: UserRole, school: string, type: 'NEW' | 'REFRESHER') => {
    // Query DB directly so login works even if background fetch isn't done
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('password', pass)
        .eq('role', role)
        .eq('school_id', school)
        .eq('account_type', type)
        // Check if email OR name matches loginId (case-insensitive)
        .or(`email.ilike.${loginId},name.ilike.${loginId}`);

    const user = data?.[0]; // Get first match

    if (user) {
      setSession({
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        schoolId: user.school_id,
        accountType: user.account_type as 'NEW' | 'REFRESHER',
        adminScope: user.admin_scope
      });
      setCurrentView('DASHBOARD');
    } else {
      alert("Verification Failed. Please check your credentials.");
    }
  };

  const handleAdminLogin = async (id: string, pass: string) => {
      // Query DB directly
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('password', pass)
        .or(`email.ilike.${id},name.ilike.${id}`);
      
      const user = data?.[0];

      if (user && (user.role === UserRole.ADMIN || user.admin_scope)) {
          setSession({
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            schoolId: user.school_id,
            accountType: user.account_type,
            adminScope: user.admin_scope
          });
          setCurrentView('DASHBOARD');
      } else {
          alert("Invalid Admin Credentials.");
      }
  }

  const handleLogout = () => {
      setSession(null);
      setCurrentView('LANDING');
  };

  const handleRegisterUser = async (newUser: UserProfile): Promise<boolean> => {
    const { error } = await supabase.from('users').insert({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
        school_id: newUser.schoolId,
        account_type: newUser.accountType,
        admin_scope: newUser.adminScope
    });

    if (!error) {
        setUsers([...users, newUser]);
        return true;
    }
    console.error("Error registering user:", error);
    return false;
  };

  const handleAddModule = async (mod: TrainingModule) => {
      // Optimistic update
      setModules(prev => [...prev, mod]);

      const { error } = await supabase.from('modules').insert({
          id: mod.id,
          title: mod.title,
          description: mod.description,
          role: mod.role,
          category: mod.category,
          folder: mod.folder,
          video_url: mod.videoUrl,
          transcript: mod.transcript,
          questions: mod.questions
      });

      if (error) {
          console.error("Supabase Save Error:", error);
          alert("Error saving module to database: " + error.message);
          setModules(prev => prev.filter(m => m.id !== mod.id));
      } else {
          console.log("Module saved successfully with quiz.");
      }
  };

  const handleDeleteModule = async (id: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (!error) setModules(modules.filter(m => m.id !== id));
      else alert("Failed to delete module: " + error.message);
  };

  const handleUpdateProgress = async (moduleId: string, data: Partial<UserProgress>) => {
    if (!session) return;
    
    // Optimistic Update
    setProgress(prev => {
      const existingIdx = prev.findIndex(p => p.userId === session.email && p.moduleId === moduleId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...data };
        return updated;
      } else {
        return [...prev, {
          userId: session.email,
          moduleId,
          videoWatched: false,
          score: null,
          passed: false,
          attempts: 0,
          ...data
        } as UserProgress];
      }
    });

    // DB Update
    const { data: existing } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', session.email)
        .eq('module_id', moduleId)
        .single();

    if (existing) {
        await supabase.from('progress').update({
            video_watched: data.videoWatched !== undefined ? data.videoWatched : existing.video_watched,
            score: data.score !== undefined ? data.score : existing.score,
            passed: data.passed !== undefined ? data.passed : existing.passed,
            attempts: data.attempts !== undefined ? data.attempts : existing.attempts,
            updated_at: new Date().toISOString()
        }).eq('id', existing.id);
    } else {
        await supabase.from('progress').insert({
            user_id: session.email,
            module_id: moduleId,
            video_watched: data.videoWatched || false,
            score: data.score,
            passed: data.passed || false,
            attempts: data.attempts || 0
        });
    }
  };

  // --- Views ---

  // NOTE: Blocking loading screen removed to allow instant app start.
  // Data fetches in background. Login checks DB directly.

  if (currentView === 'LANDING') {
      return <LandingPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'LOGIN_NEW' || currentView === 'LOGIN_REFRESHER') {
      return (
          <StaffLoginPage 
            type={currentView === 'LOGIN_NEW' ? 'NEW' : 'REFRESHER'} 
            onLogin={handleStaffLogin} 
            onBack={() => setCurrentView('LANDING')} 
          />
      );
  }

  if (currentView === 'LOGIN_ADMIN') {
      return (
          <AdminLoginPage 
            onLogin={handleAdminLogin}
            onBack={() => setCurrentView('LANDING')}
            users={users}
          />
      );
  }

  // --- Authenticated Dashboard ---
  if (!session) return null;

  // Admin / Head View
  if (session.adminScope) {
      return (
        <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
            <header className="bg-slate-900 shadow-lg border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-1.5 rounded text-white">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-none">Darshan Academy</h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {session.adminScope === 'ALL' ? 'HR / Super Admin' : 'Department Head Portal'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <span className="text-sm text-slate-200 font-medium block">{session.name}</span>
                            <span className="text-xs text-slate-500 block">{session.role}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>
            <main>
                <AdminDashboard 
                    user={session}
                    modules={modules}
                    users={users}
                    progress={progress}
                    onAddModule={handleAddModule}
                    onDeleteModule={handleDeleteModule}
                    onRegisterUser={handleRegisterUser}
                    onLogout={handleLogout}
                />
            </main>
        </div>
      );
  }

  // Staff View
  const isRefresher = session.accountType === 'REFRESHER';
  const headerColor = isRefresher ? 'bg-indigo-700' : 'bg-blue-600';
  const portalTitle = isRefresher ? 'Refresher Portal' : 'New Joining Portal';
  
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
      <header className={`shadow-sm sticky top-0 z-50 transition-colors ${headerColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded text-white backdrop-blur-sm">
                    <School className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-lg text-white leading-none">Darshan Academy</h1>
                    <p className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">{portalTitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block text-white">
                      <p className="text-sm font-bold">{session.name}</p>
                      <p className="text-xs text-blue-100 opacity-80">{session.role.replace('_', ' ')}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    className="text-white hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
            </div>
        </div>
      </header>
      
      <main>
          <UserDashboard 
            user={session}
            roleFilter={session.role}
            modules={modules}
            progress={progress.filter(p => p.userId === session.email)}
            onUpdateProgress={handleUpdateProgress}
            onLogout={handleLogout}
          />
      </main>
    </div>
  );
};

// --- Landing Page ---

const LandingPage: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-b-[3rem] shadow-2xl"></div>
             </div>

             <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                <div className="text-center mb-12">
                     <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-xl mb-6">
                         <GraduationCap className="w-12 h-12 text-blue-800" />
                     </div>
                     <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">Darshan Academy</h1>
                     <p className="text-blue-200 text-lg font-medium">Staff Onboarding & LMS Portal</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                    {/* New Joining Card */}
                    <button 
                        onClick={() => onNavigate('LOGIN_NEW')}
                        className="group bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left border border-transparent hover:border-blue-400 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <UserPlus className="w-24 h-24 text-blue-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <UserPlus className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">New Joining</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Complete your onboarding process, learn the vision, and get certified for your new role.
                            </p>
                            <div className="mt-6 flex items-center text-blue-600 font-bold text-sm">
                                Enter Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </button>

                    {/* Refresher Card */}
                    <button 
                        onClick={() => onNavigate('LOGIN_REFRESHER')}
                        className="group bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left border border-transparent hover:border-indigo-400 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <RefreshCw className="w-24 h-24 text-indigo-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <RefreshCw className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Refresher</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Update your skills, review new policies, and stay aligned with the academy's ethos.
                            </p>
                            <div className="mt-6 flex items-center text-indigo-600 font-bold text-sm">
                                Enter Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </button>

                    {/* Administrative Card */}
                    <button 
                        onClick={() => onNavigate('LOGIN_ADMIN')}
                        className="group bg-slate-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left border border-slate-700 hover:border-slate-500 relative overflow-hidden"
                    >
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="w-24 h-24 text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center mb-6 text-slate-300 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Administrative</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                HR and Department Heads login to manage staff, track progress, and update curriculum.
                            </p>
                            <div className="mt-6 flex items-center text-white font-bold text-sm">
                                Secure Login <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </button>
                </div>
             </div>
             
             <div className="p-4 text-center text-slate-400 text-xs">
                 &copy; 2025 Darshan Academy. Secure Internal System.
             </div>
        </div>
    )
}

// --- Staff Login Page ---

interface StaffLoginProps {
    type: 'NEW' | 'REFRESHER';
    onLogin: (n: string, p: string, r: UserRole, s: string, t: 'NEW' | 'REFRESHER') => void;
    onBack: () => void;
}

const StaffLoginPage: React.FC<StaffLoginProps> = ({ type, onLogin, onBack }) => {
    const isNew = type === 'NEW';
    const isRefresher = type === 'REFRESHER';
    
    // Auto-fill logic removed
    const [loginId, setLoginId] = useState('');
    const [pass, setPass] = useState('');
    const [role, setRole] = useState(AVAILABLE_ROLES[0].value);
    const [school, setSchool] = useState(SCHOOL_LOCATIONS[0]);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(loginId, pass, role as UserRole, school, type);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className={`relative p-6 text-center text-white ${isNew ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                    {/* Changed to native button to avoid position conflicts and added z-index */}
                    <button 
                        onClick={onBack} 
                        className="absolute right-4 top-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors z-50"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-3">
                        {isNew ? <UserPlus className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
                    </div>
                    <h2 className="text-2xl font-bold">{isNew ? 'New Joining Login' : 'Refresher Login'}</h2>
                    <p className="text-white/80 text-sm">Please verify your details to access.</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Login ID</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                value={loginId} 
                                onChange={e => setLoginId(e.target.value)} 
                                placeholder="Enter Login ID" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    required 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full bg-white border border-gray-300 rounded-md p-3 pr-10 text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                    value={pass} 
                                    onChange={e => setPass(e.target.value)} 
                                    placeholder="••••••••" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Profession</label>
                            <select className="w-full border border-gray-300 rounded-md p-3 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                                {AVAILABLE_ROLES.filter(r => r.value !== UserRole.ADMIN).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-800 uppercase mb-1">School Name</label>
                            <select className="w-full border border-gray-300 rounded-md p-3 bg-white text-gray-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={school} onChange={e => setSchool(e.target.value)}>
                                {SCHOOL_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <Button type="submit" className={`w-full py-3.5 mt-2 font-bold text-base shadow-md ${isNew ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            Verify & Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- Admin Login Page ---

const AdminLoginPage: React.FC<{ onLogin: (i: string, p: string) => void, onBack: () => void, users: UserProfile[] }> = ({ onLogin, onBack, users }) => {
    const [id, setId] = useState('');
    const [pass, setPass] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Filter relevant "HEAD" accounts
    const heads = users.filter(u => u.adminScope && u.adminScope !== 'ALL');
    const hr = users.find(u => u.adminScope === 'ALL');

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
                {/* Login Form */}
                <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 h-fit">
                    <div className="p-6 border-b border-slate-700 flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-400" /> Admin Access
                        </h2>
                    </div>
                    <div className="p-8">
                        <form onSubmit={(e) => { e.preventDefault(); onLogin(id, pass); }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Admin ID / Email</label>
                                <input required type="text" className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={id} onChange={e => setId(e.target.value)} placeholder="Enter Admin ID" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                                <div className="relative">
                                    <input 
                                        required 
                                        type={showPassword ? "text" : "password"} 
                                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 pr-10 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                                        value={pass} 
                                        onChange={e => setPass(e.target.value)} 
                                        placeholder="••••••••" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 border-none text-white font-bold">
                                Login
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Demo Credentials Panel */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 text-slate-300">
                    <div className="flex items-center gap-2 mb-6 text-blue-400">
                        <Info className="w-5 h-5" />
                        <h3 className="font-bold">Profession Head Credentials</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {/* HR SECTION */}
                        {hr && (
                             <div className="bg-purple-900/40 p-4 rounded-lg border border-purple-800 text-sm mb-4">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Super Admin (HR)</span>
                                </div>
                                <div className="flex justify-between items-center text-white font-mono">
                                    <span>ID: <span className="font-bold">{hr.email}</span></span>
                                    <span>Pass: <span className="font-bold">{hr.password}</span></span>
                                </div>
                            </div>
                        )}

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department Heads</p>
                        
                        {heads.map((u, idx) => (
                            <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                <div>
                                    <p className="font-bold text-white text-xs mb-1.5">{u.name}</p>
                                    <div className="flex gap-2 text-slate-400 text-[10px] font-semibold items-center bg-slate-900/50 px-2 py-1 rounded w-fit">
                                        <Lock className="w-3 h-3" />
                                        <span>Scope: {u.adminScope}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ID / Pass</p>
                                     <p className="font-mono text-blue-200 text-sm">{u.email} <span className="text-slate-500 mx-1">/</span> {u.password}</p>
                                </div>
                            </div>
                        ))}
                        
                    </div>
                     <p className="text-xs text-slate-500 italic mt-6 border-t border-slate-700 pt-4 text-center">
                            Use these "Head" accounts to test department-specific views (e.g., Head of Accounts only sees accountants).
                     </p>
                </div>
            </div>
        </div>
    );
}

export default App;
