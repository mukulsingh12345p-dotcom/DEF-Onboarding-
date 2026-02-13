
import React, { useState } from 'react';
import { UserRole, TrainingModule, UserProfile, UserProgress, UserSession } from '../types';
import { AVAILABLE_ROLES, SCHOOL_LOCATIONS } from '../constants';
import { generateQuizFromTopic } from '../services/geminiService';
import { Button } from './Button';
import { Plus, Trash2, Wand2, BookOpen, Users, BarChart3, Search, UserPlus, Key, Lock, FolderPlus, Folder, AlertTriangle, FolderOpen, ArrowLeft, Layers, Eye, EyeOff } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

  // Scope Logic
  const isHR = user.adminScope === 'ALL';
  const roleScope = (!isHR && user.adminScope) ? (user.adminScope as UserRole) : null;

  const tabs = [
    { id: 'analytics', label: 'Progress Analytics', icon: BarChart3 },
    { id: 'modules', label: 'Curriculum & Modules', icon: BookOpen },
    ...(isHR ? [{ id: 'users', label: 'ID Creation (HR)', icon: Users }] : [])
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
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 w-fit shadow-sm">
              {tabs.map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
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
          
          {roleScope && (
              <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded text-xs font-bold border border-blue-100 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Viewing: {roleScope} Department
              </div>
          )}
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
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                roleFilter={roleScope}
            />
          )}

          {activeTab === 'users' && isHR && (
              <UserManagement 
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
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const isHR = user.adminScope === 'ALL';

    // Folder Logic for Add Form
    const [folderMode, setFolderMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
    const [customFolderName, setCustomFolderName] = useState('');

    const [newModule, setNewModule] = useState<Partial<TrainingModule>>({
        title: '',
        description: 'Standard Training Module',
        role: forcedRole || UserRole.TEACHER,
        category: 'NEW',
        folder: selectedFolder || 'DEF Guidelines',
        videoUrl: '',
        transcript: '',
        questions: []
    });

    // Folders available for the dropdown in "Add Module"
    const currentRoleFolders: string[] = Array.from(new Set(
        modules
        .filter(m => m.role === newModule.role)
        .map(m => m.folder || 'DEF Guidelines')
    ));
    if (!currentRoleFolders.includes('DEF Guidelines')) currentRoleFolders.unshift('DEF Guidelines');

    // Filter modules based on scope
    const filteredModules = forcedRole ? modules.filter(m => m.role === forcedRole) : modules;

    // Get unique folders for display
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
                // If we get here, it (likely) succeeded or handled its own error
                setIsAdding(false);
                setCustomFolderName('');
                setFolderMode('EXISTING');
                setNewModule({ 
                    title: '', 
                    description: 'Standard Training Module', 
                    role: forcedRole || UserRole.TEACHER, 
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
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Curriculum Management</h2>
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
                    {uniqueFolders.map(folderName => {
                        const folderModules = filteredModules.filter(m => (m.folder || 'DEF Guidelines') === folderName);
                        return (
                            <div key={folderName} className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative" onClick={() => setSelectedFolder(folderName)}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {folderName === 'DEF Guidelines' ? <Layers className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                                    </div>
                                    {isHR && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(folderName, forcedRole || undefined);
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
                    })}
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
                    
                    <div className="p-0">
                        {/* Specific Logic for DEF Guidelines: Group by Profession */}
                        {selectedFolder === 'DEF Guidelines' ? (
                            <div className="divide-y divide-gray-100">
                                {Array.from(new Set(filteredModules.filter(m => (m.folder || 'DEF Guidelines') === selectedFolder).map(m => m.role))).map(role => (
                                    <div key={role} className="p-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Users className="w-3 h-3" />
                                            {role}
                                        </h4>
                                        <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                                            {filteredModules.filter(m => (m.folder || 'DEF Guidelines') === selectedFolder && m.role === role).map(m => (
                                                 <div key={m.id} className="flex justify-between items-center group p-2 rounded hover:bg-gray-50">
                                                    <div>
                                                        <h5 className="font-bold text-sm text-gray-900">{m.title}</h5>
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold">{m.questions.length} Qs</span>
                                                    </div>
                                                    {isHR && (
                                                        <button onClick={() => onDeleteModule(m.id)} className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Module">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Generic Folder View - Just List */
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
                                        {isHR && (
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
    searchTerm: string;
    onSearchChange: (s: string) => void;
    roleFilter: UserRole | null;
}> = ({ users, progress, modules, searchTerm, onSearchChange, roleFilter }) => {
    const filteredUsers = users.filter(u => {
        const roleMatch = roleFilter ? u.role === roleFilter : true;
        const searchMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm);
        const notAdmin = u.role !== UserRole.ADMIN;
        return roleMatch && searchMatch && notAdmin;
    });

    const getProgressStats = (userEmail: string, role: UserRole) => {
        const userModules = modules.filter(m => m.role === role);
        if (userModules.length === 0) return { percent: 0, label: 'No Modules' };

        const passedCount = userModules.filter(m => {
            // Updated to use userEmail (Link via Email/ID)
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
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Staff Progress & Performance</h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Search staff..." 
                        className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
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
                            // Link using user.email
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
        </div>
    );
};

const UserManagement: React.FC<{ users: UserProfile[], onRegisterUser: (user: UserProfile) => Promise<boolean> }> = ({ users, onRegisterUser }) => {
    const [formData, setFormData] = useState({
        name: '', 
        email: '', 
        password: '', 
        role: AVAILABLE_ROLES[0].value, 
        school: SCHOOL_LOCATIONS[0],
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
                schoolId: formData.school,
                joinedAt: new Date().toISOString(),
                accountType: formData.accountType
            });
            setIsSubmitting(false);

            if (success) {
                setMsg({ type: 'success', text: 'User account created successfully in Database.' });
                setFormData({ ...formData, name: '', email: '', password: '' });
            } else {
                setMsg({ type: 'error', text: 'Login ID already registered.' });
            }
        }
    };
    // ... (rest of component matches existing structure, omitting render block which is identical except for handleSubmit)
    
    // Minimal re-render for brevity - mostly identical to before
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.schoolId.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            <p className="text-xs text-gray-500">Only HR can add new users.</p>
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
                            <select className="w-full bg-white text-gray-900 border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})}>
                                {SCHOOL_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
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
                            Registered Accounts
                        </h3>
                        <div className="relative">
                            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search users..." 
                                className="pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-900 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Name / ID</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Role</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">School</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((u, i) => (
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
