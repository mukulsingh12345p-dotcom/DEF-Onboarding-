
import React, { useState } from 'react';
import { UserSession, TrainingModule, UserProgress, UserRole } from '../types';
import { Button } from './Button';
import { PlayCircle, Lock, CheckCircle, Award, MonitorPlay, RefreshCw, ArrowRight, ExternalLink, RotateCcw, AlertTriangle, BookOpen, ChevronDown, ChevronRight, Folder } from 'lucide-react';

interface UserDashboardProps {
  user: UserSession;
  roleFilter: UserRole;
  modules: TrainingModule[];
  progress: UserProgress[];
  onUpdateProgress: (moduleId: string, data: Partial<UserProgress>) => void;
  onLogout: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, roleFilter, modules, progress, onUpdateProgress, onLogout }) => {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); 
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  // Filter: Match Role only. (All modules available to both NEW and REFRESHER types)
  const myModules = modules.filter(m => m.role === roleFilter);

  // Group modules by Folder
  const groupedModules = myModules.reduce((acc, module) => {
      const folderName = module.folder || 'DEF Guidelines'; // Default folder if undefined
      if (!acc[folderName]) {
          acc[folderName] = [];
      }
      acc[folderName].push(module);
      return acc;
  }, {} as Record<string, TrainingModule[]>);

  // Initialize expanded state for folders (open DEF Guidelines by default)
  if (Object.keys(expandedFolders).length === 0 && Object.keys(groupedModules).length > 0) {
      setExpandedFolders(prev => {
          const newState = { ...prev };
           Object.keys(groupedModules).forEach(key => newState[key] = true);
           return newState;
      });
  }

  const toggleFolder = (folderName: string) => {
      setExpandedFolders(prev => ({
          ...prev,
          [folderName]: !prev[folderName]
      }));
  };

  const activeModule = modules.find(m => m.id === activeModuleId);
  // use ModuleId to find progress
  const activeProgress = progress.find(p => p.moduleId === activeModuleId);
  
  const hasWatchedVideo = activeProgress?.videoWatched || false;
  const isPassed = activeProgress?.passed || false;
  const attempts = activeProgress?.attempts || 0;
  
  // 3-Strike Rule Logic
  const isStrikeOut = !isPassed && attempts >= 3;

  const isModuleLocked = (index: number) => {
      if (index === 0) return false;
      const prevModule = myModules[index - 1];
      const prevProg = progress.find(p => p.moduleId === prevModule.id);
      return !prevProg || !prevProg.passed;
  };

  const isVideoLink = (url: string) => {
      return url.includes('drive.google.com') || url.includes('youtu.be');
  };

  const handleStartModule = (id: string) => {
    setActiveModuleId(id);
    setShowQuiz(false);
    setIsPlaying(false);
    setQuizFinished(false);
    resetQuizState();
  };

  const resetQuizState = () => {
    setCurrentQuestionIdx(0);
    setQuizScore(0);
    setSelectedOption(null);
    setQuizFinished(false);
  }

  const handleStartWatching = () => {
     if (activeModule && activeModule.videoUrl.includes('drive.google.com')) {
         window.open(activeModule.videoUrl, '_blank');
         onUpdateProgress(activeModule.id, { videoWatched: true });
         return;
     }
     setIsPlaying(true);
  };

  const handleVideoComplete = () => {
    if (activeModuleId) {
      onUpdateProgress(activeModuleId, { videoWatched: true });
      setIsPlaying(false);
    }
  };

  const handleManualVideoComplete = () => {
      if (activeModuleId) {
          onUpdateProgress(activeModuleId, { videoWatched: true });
      }
  }

  const handleStartQuiz = () => {
    if (isStrikeOut) return; 
    resetQuizState();
    setShowQuiz(true);
    if (activeModuleId) {
        onUpdateProgress(activeModuleId, { score: null }); 
    }
  };

  const handleRewatch = () => {
      if (!activeModuleId) return;

      onUpdateProgress(activeModuleId, { 
          videoWatched: false, 
          score: null, 
          passed: false,
          attempts: 0 
      });

      const module = modules.find(m => m.id === activeModuleId);
      
      if (module && module.videoUrl.includes('drive.google.com')) {
          window.open(module.videoUrl, '_blank');
          onUpdateProgress(activeModuleId, { videoWatched: true, attempts: 0 });
          setShowQuiz(false);
          setIsPlaying(false);
          return;
      }

      setShowQuiz(false);
      setIsPlaying(true);
  };

  const handleNextQuestion = () => {
      if (!activeModule) return;

      const isCorrect = selectedOption === activeModule.questions[currentQuestionIdx].correctAnswer;
      const pointValue = 100 / activeModule.questions.length;
      if (isCorrect) {
          setQuizScore(prev => prev + pointValue);
      }

      if (currentQuestionIdx < activeModule.questions.length - 1) {
          setCurrentQuestionIdx(prev => prev + 1);
          setSelectedOption(null);
      } else {
          const finalScore = isCorrect ? quizScore + pointValue : quizScore;
          const passed = Math.round(finalScore) >= 60;
          
          setQuizFinished(true);
          onUpdateProgress(activeModule.id, {
              score: Math.round(finalScore),
              passed: passed,
              attempts: passed ? attempts : attempts + 1 
          });
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar: Module List Grouped by Folder */}
        <div className="lg:col-span-1 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Training Modules
            </h2>
            <div className="space-y-4">
                {(Object.entries(groupedModules) as [string, TrainingModule[]][]).map(([folderName, folderModules], folderIdx) => (
                    <div key={folderName} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <button 
                            onClick={() => toggleFolder(folderName)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                            <span className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <Folder className="w-4 h-4 text-blue-500" />
                                {folderName}
                            </span>
                            {expandedFolders[folderName] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </button>
                        
                        {expandedFolders[folderName] && (
                            <div className="p-2 space-y-2">
                                {folderModules.map((m) => {
                                    // Find global index for locking logic
                                    const globalIdx = myModules.findIndex(mod => mod.id === m.id);
                                    const mProgress = progress.find(p => p.moduleId === m.id);
                                    const locked = isModuleLocked(globalIdx);
                                    const isActive = activeModuleId === m.id;

                                    return (
                                        <button
                                            key={m.id}
                                            disabled={locked}
                                            onClick={() => handleStartModule(m.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 relative group
                                                ${isActive 
                                                    ? 'bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-400' 
                                                    : locked 
                                                        ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' 
                                                        : 'bg-white border-gray-200 hover:border-blue-300'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-1 inline-block
                                                    ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}
                                                `}>
                                                    Module
                                                </span>
                                                {mProgress?.passed && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                {locked && <Lock className="w-3 h-3 text-gray-400" />}
                                            </div>
                                            
                                            <h3 className={`font-bold text-xs leading-tight mb-1 ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                                                {m.title}
                                            </h3>

                                            {/* Status Bar */}
                                            {!locked && (
                                                <div className="mt-1">
                                                    <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${mProgress?.passed ? 'bg-green-500' : 'bg-blue-500'}`}
                                                            style={{ width: mProgress?.passed ? '100%' : mProgress?.videoWatched ? '50%' : '0%' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
            {activeModule ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                            <Folder className="w-3 h-3" />
                            {activeModule.folder || 'DEF Guidelines'}
                        </div>
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">{activeModule.title}</h1>
                            <div className="flex items-center gap-3">
                                {isPassed && (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        <Award className="w-4 h-4" /> COMPLETED
                                    </span>
                                )}
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {user.accountType}
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-500 mt-2 text-sm">{activeModule.description}</p>
                    </div>

                    <div className="p-8">
                        {/* VIEW: VIDEO PLAYER */}
                        {isPlaying ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group">
                                    <iframe 
                                        src={activeModule.videoUrl} 
                                        className="w-full h-full" 
                                        allow="autoplay; encrypted-media" 
                                        allowFullScreen
                                        title={activeModule.title}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-500 italic">Watch the entire video to unlock the quiz.</p>
                                    <Button onClick={handleVideoComplete} className="bg-green-600 hover:bg-green-700 text-white">
                                        I have finished watching <CheckCircle className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        ) : showQuiz ? (
                            /* VIEW: QUIZ INTERFACE */
                            <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
                                {quizFinished ? (
                                    <div className="text-center py-12">
                                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${activeProgress?.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {activeProgress?.passed ? <Award className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                            {activeProgress?.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                                        </h2>
                                        <p className="text-gray-500 mb-8 text-lg">
                                            You scored <span className="font-bold text-gray-900">{activeProgress?.score}%</span>. 
                                            {activeProgress?.passed ? ' Great job!' : ' You need 60% to pass.'}
                                        </p>
                                        
                                        <div className="flex justify-center gap-4">
                                            {activeProgress?.passed ? (
                                                <Button onClick={() => handleStartModule(myModules[myModules.findIndex(m => m.id === activeModule.id) + 1]?.id || activeModule.id)} className="px-8">
                                                    Next Module <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            ) : (
                                                <Button onClick={() => setShowQuiz(false)} variant="outline">
                                                    Return to Dashboard
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl">
                                        <div className="flex justify-between items-center mb-6 text-sm font-medium text-gray-500">
                                            <span>Question {currentQuestionIdx + 1} of {activeModule.questions.length}</span>
                                            <span>Progress: {Math.round(((currentQuestionIdx) / activeModule.questions.length) * 100)}%</span>
                                        </div>
                                        
                                        <div className="w-full bg-gray-100 h-2 rounded-full mb-8">
                                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIdx) / activeModule.questions.length) * 100}%` }}></div>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
                                            {activeModule.questions[currentQuestionIdx].text}
                                        </h3>

                                        <div className="space-y-3 mb-8">
                                            {activeModule.questions[currentQuestionIdx].options.map((opt, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedOption(idx)}
                                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between group
                                                        ${selectedOption === idx 
                                                            ? 'border-blue-600 bg-blue-50 text-blue-900' 
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                        }
                                                    `}
                                                >
                                                    <span className="font-medium">{opt}</span>
                                                    {selectedOption === idx && <CheckCircle className="w-5 h-5 text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button 
                                                disabled={selectedOption === null} 
                                                onClick={handleNextQuestion}
                                                className="px-8 py-3 text-base shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {currentQuestionIdx === activeModule.questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* VIEW: MODULE DASHBOARD (DEFAULT) */
                            <div className="max-w-3xl mx-auto py-8">
                                {/* 3-STRIKE WARNING */}
                                {isStrikeOut ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                                        <div className="flex items-center gap-3 text-amber-800 font-bold mb-2">
                                            <AlertTriangle className="w-6 h-6" />
                                            <span>Maximum Attempts Reached</span>
                                        </div>
                                        <p className="text-amber-700 text-sm mb-6 leading-relaxed">
                                            You have failed the assessment <strong>{attempts} times</strong>. To ensure you fully understand the material and maintain quality standards, the system requires you to re-watch the training video before attempting the quiz again.
                                        </p>
                                        <Button onClick={handleRewatch} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-transparent">
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Re-watch Video to Unlock
                                        </Button>
                                    </div>
                                ) : (
                                    /* NORMAL DASHBOARD CONTENT */
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                                        {/* Video Card */}
                                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                                <MonitorPlay className="w-8 h-8" />
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">Training Video</h3>
                                            <p className="text-sm text-gray-500 mb-6">
                                                {hasWatchedVideo ? "You have completed this video." : "Required before taking the quiz."}
                                            </p>
                                            
                                            {hasWatchedVideo ? (
                                                <Button onClick={handleRewatch} variant="outline" size="sm" className="mt-auto w-full">
                                                    <RotateCcw className="w-4 h-4 mr-2" /> Watch Again
                                                </Button>
                                            ) : (
                                                <Button onClick={handleStartWatching} className="mt-auto w-full shadow-blue-200 shadow-lg">
                                                    <PlayCircle className="w-4 h-4 mr-2" /> Start Watching
                                                </Button>
                                            )}
                                        </div>

                                        {/* Quiz Card */}
                                        <div className={`rounded-xl p-6 border flex flex-col items-center text-center transition-shadow
                                            ${hasWatchedVideo ? 'bg-indigo-50 border-indigo-100 hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-70'}
                                        `}>
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 
                                                ${hasWatchedVideo ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}
                                            `}>
                                                {isPassed ? <Award className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">Assessment Quiz</h3>
                                            <p className="text-sm text-gray-500 mb-6">
                                                {isPassed 
                                                    ? `Passed with ${activeProgress?.score}%` 
                                                    : hasWatchedVideo 
                                                        ? "Test your knowledge to complete the module." 
                                                        : "Locked until video is watched."}
                                            </p>

                                            {isPassed ? (
                                                <div className="mt-auto w-full bg-green-100 text-green-700 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2">
                                                    <Award className="w-4 h-4" /> Certified
                                                </div>
                                            ) : (
                                                <Button 
                                                    onClick={handleStartQuiz} 
                                                    disabled={!hasWatchedVideo} 
                                                    className={`mt-auto w-full ${hasWatchedVideo ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-lg' : ''}`}
                                                >
                                                    {attempts > 0 ? `Retake Quiz (Attempt ${attempts + 1})` : 'Take Quiz'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Instructions / Context */}
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-gray-500" />
                                        Instructions
                                    </h4>
                                    <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                                        <li>Watch the video completely to unlock the assessment.</li>
                                        <li>You need 60% or higher to pass the quiz.</li>
                                        <li>If you fail 3 times, you must re-watch the video to try again.</li>
                                        <li>Your progress is saved automatically.</li>
                                        {isVideoLink(activeModule.videoUrl) && (
                                            <li className="text-blue-600">This module uses an external video player. Please ensure pop-ups are allowed.</li>
                                        )}
                                    </ul>
                                    {isVideoLink(activeModule.videoUrl) && hasWatchedVideo && !isPassed && !isStrikeOut && (
                                         <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 mb-2">Trouble unlocking the quiz?</p>
                                            <Button onClick={handleManualVideoComplete} variant="outline" size="sm" className="text-xs">
                                                Force Mark Video as Watched
                                            </Button>
                                         </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-gray-200 border-dashed text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <PlayCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">No Module Selected</h3>
                    <p className="text-sm">Select a training module from the sidebar to begin.</p>
                </div>
            )}
        </div>
    </div>
  );
};
