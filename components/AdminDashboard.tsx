
import React, { useState, useMemo } from 'react';
import { UserRole, TrainingModule, UserProfile, UserProgress, UserSession } from '../types';
import { AVAILABLE_ROLES, SCHOOL_LOCATIONS } from '../constants';
import { generateQuizFromTopic } from '../services/geminiService';
import { Button } from './Button';
import { Plus, Trash2, Wand2, BookOpen, Users, BarChart3, Search, UserPlus, Key, Lock, FolderPlus, Folder, AlertTriangle, FolderOpen, ArrowLeft, Layers, Eye, EyeOff, Building2, Filter } from 'lucide-react';

interface AdminDashboardProps {
  user: UserSession;
  modules: TrainingModule[];
  users: UserProfile[];
  progress: UserProgress[];
  onAddModule: (module: TrainingModule) => Promise<void>;
  onDeleteModule: (id: string) => Promise<void>;
  onRegisterUser: (user: UserProfile) => Promise<boolean>;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user,
  modules, 
  users, 
  progress, 
  onAddModule, 
  onDeleteModule,
  onRegisterUser, 
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'analytics' | 'users'>('analytics');
  
  // Scope Logic
  // HR/Super Admin (Head Office) sees all. Branch admins see their own branch.
  const isHeadOffice = user.schoolId === 'Head Office' || user.adminScope === 'ALL';
  const roleScope = (!isHeadOffice && user.adminScope) ? (user.adminScope as UserRole) : null;

  const tabs = [
    { id: 'analytics', label: 'Staff Progress & Reports', icon: BarChart3 },
    { id: 'modules', label: 'Curriculum & Modules', icon: BookOpen },
    { id: 'users', label: 'Staff Credentials', icon: Users } 
  ];

  // Helper to delete all modules in a folder
  const handleDeleteFolder = (folderName: string, role?: UserRole) => {
      if (!window.confirm(`Are you sure you want to delete the folder "${folderName}" and ALL its modules? This cannot be undone.`)) return;
      
      const modulesToDelete = modules.filter(m => 
          (m.folder === folderName || (!m.folder && folderName === 'DEF Guidelines')) && 
          (role ? m.role === role : true)
      );
      
      modulesToDelete.forEach(m => onDeleteModule(m.id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 w-full sm:w-fit shadow-sm overflow-x-auto">
              {tabs.map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap
                          ${activeTab === tab.id 
                              ? 'bg-slate-800 text-white shadow' 
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                      `}
                  >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                  </button>
              ))}
          </div>
          
          <div className="flex gap-2">
            {roleScope && (
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs font-bold border border-blue-100 flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Dept: {roleScope}
                </div>
            )}
             <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold border border-slate-200 flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                {user.schoolId === 'Head Office' ? 'HQ Access' : user.schoolId}
            </div>
          </div>
      </div>

      <div>
          {activeTab === 'modules' && (
            <ModulesManager 
                user={user}
                modules={modules} 
                onAddModule={onAddModule} 
                onDeleteModule={onDeleteModule} 
                onDeleteFolder={handleDeleteFolder}
                forcedRole={roleScope} 
            />
          )}
          
          {activeTab === 'analytics' && (
            <AnalyticsView 
                users={users} 
                progress={progress} 
                modules={modules} 
                isHeadOffice={isHeadOffice}
                adminSchoolId={user.schoolId} 
            />
          )}

          {activeTab === 'users' && (
              <UserManagement 
                 user={user}
                 users={users}
                 onRegisterUser={onRegisterUser}
              />
          )}
      </div>
    </div>
  );
};

// --- Sub-Components ---

const ModulesManager: React.FC<{
    user: UserSession;
    modules: TrainingModule[];
    onAddModule: (module: TrainingModule) => Promise<void>;
    onDeleteModule: (id: string) => Promise<void>;
    onDeleteFolder: (folderName: string, role?: UserRole) => void;
    forcedRole: UserRole | null;
}> = ({ user, modules, onAddModule, onDeleteModule, onDeleteFolder, forcedRole }) => {
    const isHeadOffice = user.schoolId === 'Head Office' || user.adminScope === 'ALL';

    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // View Filters
    const [viewBranch, setViewBranch] = useState(SCHOOL_LOCATIONS[0]); // Default to first branch for HQ view simulation
    const [viewRole, setViewRole] = useState<UserRole>(forcedRole || UserRole.TEACHER);

    // Folder Logic for Add Form
    const [folderMode, setFolderMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
    const [customFolderName, setCustomFolderName] = useState('');

    const [newModule, setNewModule] = useState<Partial<TrainingModule>>({
        title: '',
        description: 'Standard Training Module',
        role: viewRole, // Default to currently viewed role
        category: 'NEW',
        folder: selectedFolder || 'DEF Guidelines',
        videoUrl: '',
        transcript: '',
        questions: []
    });

    // Update new module role when view role changes
    useMemo(() => {
        if (!isAdding) {
            setNewModule(prev => ({ ...prev, role: viewRole }));
        }
    }, [viewRole, isAdding]);


    // Folders available for the dropdown in "Add Module"
    const currentRoleFolders: string[] = Array.from(new Set(
        modules
        .filter(m => m.role === newModule.role)
        .map(m => m.folder || 'DEF Guidelines')
    ));
    if (!currentRoleFolders.includes('DEF Guidelines')) currentRoleFolders.unshift('DEF Guidelines');

    // Filter modules based on Hierarchy: Profession -> Folder
    const filteredModules = modules.filter(m => m.role === viewRole);

    // Get unique folders for display based on the selected Profession
    const uniqueFolders = Array.from(new Set(filteredModules.map(m => m.folder || 'DEF Guidelines'))).sort();

    const handleGenerateQuiz = async () => {
        if (!newModule.transcript || !newModule.role) {
            alert("Please enter transcript/content and ensure role is selected to generate quiz.");
            return;
        }
        setLoading(true);
        try {
            const questions = await generateQuizFromTopic(newModule.transcript, newModule.role);
            setNewModule({ ...newModule, questions });
        } catch (e) {
            console.error(e);
            alert("Failed to generate quiz");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const finalFolder = folderMode === 'NEW' ? customFolderName : newModule.folder;

        if (newModule.title && newModule.role && newModule.videoUrl && newModule.questions?.length && finalFolder) {
            setIsSaving(true);
            try {
                await onAddModule({
                    id: Date.now().toString(),
                    ...newModule as TrainingModule,
                    folder: finalFolder,
                    description: newModule.description || ' '
                });
                // Reset
                setIsAdding(false);
                setCustomFolderName('');
                setFolderMode('EXISTING');
                setNewModule({ 
                    title: '', 
                    description: 'Standard Training Module', 
                    role: viewRole, 
                    category: 'NEW', 
                    folder: selectedFolder || 'DEF Guidelines',
                    videoUrl: '', 
                    transcript: '', 
                    questions: [] 
                });
            } catch (e) {
                console.error("Save failed", e);
            } finally {
                setIsSaving(false);
            }
        } else {
            alert("Please fill all fields, ensure a folder is selected/created, and generate quiz questions.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h2 className="text-xl font-bold text-gray-800">Curriculum Management</h2>
                     <p className="text-xs text-gray-500">Manage modules for specific professions.</p>
                </div>
                
                <div className="flex gap-2">
                    <Button onClick={() => {
                        setIsAdding(!isAdding);
                        if (!isAdding && selectedFolder) {
                            setNewModule(prev => ({ ...prev, folder: selectedFolder }));
                        }
                    }}>
                        {isAdding ? 'Cancel' : 'Add New Module'}
                    </Button>
                </div>
            </div>

            {/* HIERARCHY FILTERS: Branch (HQ Only) -> Profession */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Filter className="w-4 h-4" />
                    Filters:
                 </div>

                 {isHeadOffice && (
                     <div className="w-full md:w-auto">
                        <select 
                            value={viewBranch}
                            onChange={(e) => setViewBranch(e.target.value)}
                            className="w-full md:w-64 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                        >
                            {SCHOOL_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Viewing curriculum for: {viewBranch}</p>
                     </div>
                 )}

                 <div className="w-full md:w-auto">
                    <select 
                        value={viewRole}
                        onChange={(e) => {
                            setViewRole(e.target.value as UserRole);
                            setSelectedFolder(null); // Reset folder selection when role changes
                        }}
                        disabled={!!forcedRole}
                        className="w-full md:w-64 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
                    >
                        {AVAILABLE_ROLES.filter(r => r.value !== UserRole.ADMIN).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                 </div>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">Create New Module</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            placeholder="Module Title" 
                            value={newModule.title} 
                            onChange={e => setNewModule({...newModule, title: e.target.value})} 
                        />
                        <select 
                            className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            value={newModule.role} 
                            onChange={e => setNewModule({...newModule, role: e.target.value as UserRole})}
                            disabled={!!forcedRole}
                        >
                            {AVAILABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* FOLDER SELECTION SECTION */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Folder / Category</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={folderMode === 'EXISTING'} 
                                    onChange={() => setFolderMode('EXISTING')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-800">Select Existing Folder</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    checked={folderMode === 'NEW'} 
                                    onChange={() => setFolderMode('NEW')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-800">Create New Folder</span>
                            </label>
                        </div>

                        {folderMode === 'EXISTING' ? (
                            <select 
                                className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                                value={newModule.folder}
                                onChange={e => setNewModule({...newModule, folder: e.target.value})}
                            >
                                {currentRoleFolders.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-gray-500" />
                                <input 
                                    className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                                    placeholder="Enter new folder name" 
                                    value={customFolderName} 
                                    onChange={e => setCustomFolderName(e.target.value)} 
                                />
                            </div>
                        )}
                    </div>

                    <input 
                        className="w-full bg-white border border-gray-300 rounded-md p-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                        placeholder="Video URL (YouTube/Drive)" 
                        value={newModule.videoUrl} 
                        onChange={e => setNewModule({...newModule, videoUrl: e.target.value})} 
                    />
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Transcript / Content for Quiz Generation</label>
                        <textarea 
                            className="w-full bg-white border border-gray-300 rounded-md p-3 h-40 font-mono text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            placeholder="Paste video transcript or detailed content here..." 
                            value={newModule.transcript} 
                            onChange={e => setNewModule({...newModule, transcript: e.target.value})} 
                        />
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <span className="text-sm font-medium text-gray-700">
                            {newModule.questions?.length ? `${newModule.questions.length} Questions Generated` : 'No questions yet'}
                        </span>
                        <Button onClick={handleGenerateQuiz} disabled={loading} variant="secondary" isLoading={loading}>
                            <Wand2 className="w-4 h-4 mr-2" />
                            {loading ? 'Generating...' : 'Generate Quiz with AI'}
                        </Button>
                    </div>

                    <Button onClick={handleSave} isLoading={isSaving} className="w-full py-3 text-base" disabled={!newModule.questions?.length}>
                        {isSaving ? 'Saving to Database...' : 'Save Module'}
                    </Button>
                </div>
            )}

            {!selectedFolder ? (
                // --- FOLDER VIEW ---
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uniqueFolders.length > 0 ? uniqueFolders.map(folderName => {
                        const folderModules = filteredModules.filter(m => (m.folder || 'DEF Guidelines') === folderName);
                        return (
                            <div key={folderName} className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative" onClick={() => setSelectedFolder(folderName)}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {folderName === 'DEF Guidelines' ? <Layers className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                                    </div>
                                    {isHeadOffice && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(folderName, viewRole || undefined);
                                            }}
                                            className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Folder"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-700">{folderName}</h3>
                                <p className="text-sm text-gray-500">{folderModules.length} Modules</p>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>No folders found for <strong>{viewRole}</strong>.</p>
                            <p className="text-xs">Click "Add New Module" to create one.</p>
                        </div>
                    )}
                </div>
            ) : (
                // --- MODULE LIST VIEW ---
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-in fade-in">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedFolder(null)}
                                className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">{selectedFolder}</h3>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-200 px-2 py-1 rounded">
                            {filteredModules.filter(m => (m.folder || 'DEF Guidelines') === selectedFolder).length} Modules
                        </span>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                        {filteredModules.filter(m => (m.folder || 'DEF Guidelines') === selectedFolder).map(m => (
                            <div key={m.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${m.role === UserRole.TEACHER ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {m.role}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-gray-900">{m.title}</h4>
                                </div>
                                {isHeadOffice && (
                                    <button onClick={() => onDeleteModule(m.id)} className="text-gray-400 hover:text-red-500 p-2" title="Delete Module">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {filteredModules.filter(m => (m.folder || 'DEF Guidelines') === selectedFolder).length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">Folder is empty.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalyticsView: React.FC<{
    users: UserProfile[];
    progress: UserProgress[];
    modules: TrainingModule[];
    isHeadOffice: boolean;
    adminSchoolId: string;
}> = ({ users, progress, modules, isHeadOffice, adminSchoolId }) => {
    
    // States for Filters
    const [branchFilter, setBranchFilter] = useState<string>(isHeadOffice ? 'All Branches' : adminSchoolId);
    const [roleFilter, setRoleFilter] = useState<string>('All Roles');
    const [searchTerm, setSearchTerm] = useState('');

    // FILTERING LOGIC: Branch -> Role -> Search
    const filteredUsers = users.filter(u => {
        // 1. Branch Filter
        // If Admin is Head Office: Check dropdown value. If 'All Branches', allow all.
        // If Admin is Branch HR: Must match adminSchoolId.
        const branchMatch = isHeadOffice 
            ? (branchFilter === 'All Branches' || u.schoolId === branchFilter)
            : u.schoolId === adminSchoolId;

        // 2. Role Filter
        const roleMatch = roleFilter === 'All Roles' || u.role === roleFilter;

        // 3. Search
        const searchMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm);
        
        // 4. Exclude Admins from progress report
        const notAdmin = u.role !== UserRole.ADMIN;

        return branchMatch && roleMatch && searchMatch && notAdmin;
    });

    const getProgressStats = (userEmail: string, role: UserRole) => {
        const userModules = modules.filter(m => m.role === role);
        if (userModules.length === 0) return { percent: 0, label: 'No Modules' };

        const passedCount = userModules.filter(m => {
            const p = progress.find(prog => prog.userId === userEmail && prog.moduleId === m.id);
            return p?.passed;
        }).length;

        return {
            percent: Math.round((passedCount / userModules.length) * 100),
            label: `${passedCount}/${userModules.length} Completed`
        };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">Staff Progress & Performance</h2>
            </div>

            {/* HIERARCHICAL FILTERS */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                 {/* 1. Branch Filter (Only for Head Office) */}
                 {isHeadOffice && (
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Select Branch</label>
                        <select 
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full md:w-56 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                        >
                            <option value="All Branches">All Branches</option>
                            {SCHOOL_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                 )}

                 {/* 2. Profession Filter */}
                 <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. Select Profession</label>
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full md:w-56 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                    >
                        <option value="All Roles">All Roles</option>
                        {AVAILABLE_ROLES.filter(r => r.value !== UserRole.ADMIN).map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                 </div>

                 {/* 3. Search */}
                 <div className="w-full md:flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. Search Staff</label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Name or Email ID..." 
                            className="pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                 </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Staff Name</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">School / Location</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Overall Progress</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length > 0 ? filteredUsers.map(user => {
                            const stats = getProgressStats(user.email, user.role);
                            return (
                                <tr key={user.email} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{user.schoolId}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-24">
                                                <div 
                                                    className={`h-full ${stats.percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${stats.percent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">{stats.percent}%</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">{stats.label}</div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {stats.percent === 100 ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                                                 Certified
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs font-medium">In Progress</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    No staff found matching filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View (Visible only on small screens) */}
            <div className="md:hidden space-y-4">
                {filteredUsers.length > 0 ? filteredUsers.map(user => {
                    const stats = getProgressStats(user.email, user.role);
                    return (
                        <div key={user.email} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">{user.name}</h3>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                    {user.role}
                                </span>
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                                <span className="font-semibold text-gray-400">Branch:</span> {user.schoolId}
                            </div>

                            <div className="bg-gray-50 rounded p-2 mb-2">
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="font-bold text-gray-700">Progress</span>
                                    <span className="font-bold text-blue-600">{stats.percent}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-1">
                                    <div 
                                        className={`h-full ${stats.percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${stats.percent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400">{stats.label}</span>
                                    {stats.percent === 100 ? (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 rounded">Certified</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 rounded">In Progress</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center text-gray-500 py-8 bg-white rounded-lg border border-dashed text-sm">No staff found matching filters.</div>
                )}
            </div>
        </div>
    );
};

const UserManagement: React.FC<{ 
    user: UserSession; // The logged-in admin
    users: UserProfile[]; // All users list
    onRegisterUser: (user: UserProfile) => Promise<boolean> 
}> = ({ user, users, onRegisterUser }) => {
    
    // Permission: Is this admin from head office?
    const isHeadOffice = user.schoolId === 'Head Office';

    const [formData, setFormData] = useState({
        name: '', 
        email: '', 
        password: '', 
        role: AVAILABLE_ROLES[0].value, 
        // If not Head Office, lock to their school. If Head Office, default to first school.
        school: isHeadOffice ? SCHOOL_LOCATIONS[0] : user.schoolId,
        accountType: 'NEW' as 'NEW' | 'REFRESHER'
    });
    const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (formData.name && formData.email && formData.password) {
            setIsSubmitting(true);
            const success = await onRegisterUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role as UserRole,
                schoolId: formData.school, // Uses the state, which is locked if not Head Office
                joinedAt: new Date().toISOString(),
                accountType: formData.accountType
            });
            setIsSubmitting(false);

            if (success) {
                setMsg({ type: 'success', text: 'User account created successfully in Database.' });
                setFormData({ 
                    ...formData, 
                    name: '', 
                    email: '', 
                    password: '' 
                    // Do not reset School if locked
                });
            } else {
                setMsg({ type: 'error', text: 'Login ID already registered.' });
            }
        }
    };
    
    // Filter User List for Display
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              u.schoolId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesScope = isHeadOffice ? true : u.schoolId === user.schoolId;
        return matchesSearch && matchesScope;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Create Staff Credentials</h2>
                            <p className="text-xs text-gray-500">
                                {isHeadOffice ? 'Adding for Any Branch' : `Adding for ${user.schoolId}`}
                            </p>
                        </div>
                    </div>

                    {msg && (
                        <div className={`p-3 rounded text-sm mb-6 flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            <div className={`w-2 h-2 rounded-full ${msg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {msg.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Portal Access Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="accountType" value="NEW" checked={formData.accountType === 'NEW'} onChange={() => setFormData({...formData, accountType: 'NEW'})} className="text-blue-600" />
                                    <span className="text-sm font-medium text-gray-900">New Joining</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="accountType" value="REFRESHER" checked={formData.accountType === 'REFRESHER'} onChange={() => setFormData({...formData, accountType: 'REFRESHER'})} className="text-indigo-600" />
                                    <span className="text-sm font-medium text-gray-900">Refresher</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                            <input required type="text" className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter Full Name" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Login ID (Email)</label>
                            <input required type="text" className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Enter Login ID" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Profession / Role</label>
                            <select className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                {AVAILABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Branch</label>
                            {isHeadOffice ? (
                                <select className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})}>
                                    {SCHOOL_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    disabled 
                                    value={formData.school} 
                                    className="w-full bg-gray-100 text-gray-600 border border-gray-300 rounded-md p-2 text-sm cursor-not-allowed"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    required 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 pr-10 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-400" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    placeholder="Set password" 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" isLoading={isSubmitting}>Create Credentials</Button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Key className="w-4 h-4 text-gray-500" />
                            {isHeadOffice ? 'All Registered Accounts' : `Accounts at ${user.schoolId}`}
                        </h3>
                        <div className="relative w-full md:w-auto">
                            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search users..." 
                                className="pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 outline-none w-full"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Name / ID</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Role</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">School</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length > 0 ? filteredUsers.map((u, i) => (
                                    <tr key={i} className="hover:bg-gray-50 text-sm">
                                        <td className="p-3">
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{u.role}</span>
                                        </td>
                                        <td className="p-3 text-gray-600 text-xs">{u.schoolId}</td>
                                        <td className="p-3">
                                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.accountType === 'NEW' ? 'text-blue-600 bg-blue-50' : 'text-indigo-600 bg-indigo-50'}`}>
                                                {u.accountType}
                                             </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-500 text-sm">
                                            No users found for this branch.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
