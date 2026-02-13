import React from 'react';
import { UserRole } from '../types';
import { GraduationCap, Calculator, Sparkles, Shield, UserCog, Users, LogOut } from 'lucide-react';

interface RoleSelectionScreenProps {
    userName: string;
    onSelectRole: (role: UserRole) => void;
    onLogout: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ userName, onSelectRole, onLogout }) => {
    const roles = [
        { 
            id: UserRole.TEACHER, 
            label: 'Teacher', 
            description: 'Access modules specific to teacher duties.',
            icon: GraduationCap,
            color: 'bg-blue-100 text-blue-600'
        },
        { 
            id: UserRole.ACCOUNTANT, 
            label: 'Accountant', 
            description: 'Access modules specific to accountant duties.',
            icon: Calculator,
            color: 'bg-green-100 text-green-600'
        },
        { 
            id: UserRole.CLEANING_STAFF, 
            label: 'Cleaning Staff', 
            description: 'Access modules specific to cleaning staff duties.',
            icon: Sparkles,
            color: 'bg-yellow-100 text-yellow-600'
        },
        { 
            id: UserRole.SECURITY, 
            label: 'Security', 
            description: 'Access modules specific to security duties.',
            icon: Shield,
            color: 'bg-red-100 text-red-600'
        },
        { 
            id: UserRole.PRINCIPAL, 
            label: 'Principal', 
            description: 'Leadership and administrative modules.',
            icon: UserCog,
            color: 'bg-purple-100 text-purple-600'
        },
        { 
            id: UserRole.OTHER, 
            label: 'Other Staff', 
            description: 'General onboarding and ethics modules.',
            icon: Users,
            color: 'bg-gray-100 text-gray-600'
        }
    ];

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-orange-50">
            {/* Sidebar - Dark neutral to let the content pop, but with Sky Blue accent */}
            <div className="hidden md:flex flex-col w-64 bg-neutral-900 text-white p-6 shadow-xl">
                <div className="mb-8">
                    <h2 className="text-xl font-bold">Darshan Academy</h2>
                    <p className="text-xs text-neutral-400">LMS Portal v1.0</p>
                </div>
                <nav>
                    <div className="flex items-center gap-3 p-3 bg-sky-600 rounded-lg text-white mb-2">
                        <span className="font-medium">My Learning</span>
                    </div>
                </nav>
                
                <div className="mt-auto">
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                    
                    <div className="pt-6 border-t border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white">
                                {userName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{userName}</p>
                                <p className="text-xs text-neutral-400">New Joiner</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to the Team!</h1>
                        <p className="text-lg text-gray-600">
                            To personalize your onboarding, please select your primary role at Darshan Academy.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => onSelectRole(role.id)}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-sky-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group"
                            >
                                <div className={`w-20 h-20 rounded-full ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <role.icon className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{role.label}</h3>
                                <p className="text-gray-500">{role.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};