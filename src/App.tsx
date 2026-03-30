import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Zap, 
  MessageSquare, 
  Layers, 
  Users, 
  UserPlus, 
  Settings, 
  Terminal, 
  LogOut, 
  Server, 
  Trash2, 
  Plus, 
  Ban, 
  UserMinus, 
  Mail,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Section = 'QUICK_NUKE' | 'SPAM_ALL' | 'CHANNELS' | 'ROLES' | 'MEMBERS' | 'DM_SPAM' | 'CUSTOM_NAMES' | 'TOOLS';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
}

interface Guild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
}

export default function App() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isBot, setIsBot] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch {
        setServerStatus('offline');
      }
    };
    checkStatus();
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('QUICK_NUKE');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Input states
  const [spamMsg, setSpamMsg] = useState('NUKED BY TROJAN');
  const [channelName, setChannelName] = useState('By-Trojan');
  const [channelAmount, setChannelAmount] = useState(20);
  const [roleName, setRoleName] = useState('By Trojan');
  const [roleAmount, setRoleAmount] = useState(20);
  const [dmMsg, setDmMsg] = useState('NUKED BY TROJAN');
  const [newServerName, setNewServerName] = useState('NUKED BY TROJAN');
  const [nukeMessage, setNukeMessage] = useState('@everyone **NUKED BY TROJAN CONTROL v8.0**\n**SERVER OWNED BY 1888**\nhttps://github.com/trojan-control\n' + '☠️'.repeat(10));
  const [nukeChannelCount, setNukeChannelCount] = useState(60);
  const [firstChannelName, setFirstChannelName] = useState('hello-trojan-was-here');
  const [nukeChannelNames, setNukeChannelNames] = useState('By-trojan, By-1888, nuked-by-trojan, ez-751, rip-server, trojan-was-here, owned-by-1888');
  const [nukeSpamCount, setNukeSpamCount] = useState(5);
  const [nukeSpamType, setNukeSpamType] = useState<'NORMAL' | 'WEBHOOK'>('NORMAL');
  const [customRenameChannel, setCustomRenameChannel] = useState('nuked-by-trojan');
  const [customRenameRole, setCustomRenameRole] = useState('TROJAN OWNED');
  const [randomRenameList, setRandomRenameList] = useState('owned, hacked, rip, ez, trojan, 1888');
  const [spamCount, setSpamCount] = useState(10);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedToken = token.trim();
    if (!trimmedToken) return;
    
    // Basic token validation to prevent obviously wrong inputs
    if (trimmedToken.length < 20) {
      setLoginError("Token is too short");
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s client-side timeout to allow for server-side retries

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken, isBot }),
        signal: controller.signal
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUser(data.user);
      setGuilds(data.guilds);
      setIsLoggedIn(true);
      addLog(`Logged in as ${data.user.username}`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLoginError("Request timed out. Discord or Cloudflare might be rate-limiting you. Please wait a minute and try again.");
      } else if (err.message.includes('429')) {
        setLoginError("Rate limited by Discord. Please wait at least 30 seconds before trying again.");
      } else {
        setLoginError(err.message);
      }
      addLog(`Login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const handleAction = async (type: string, data: any = {}) => {
    if (!selectedGuild) {
      addLog('Error: No server selected');
      return;
    }
    setIsLoading(true);
    addLog(`Executing action: ${type}...`);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, isBot, guildId: selectedGuild.id, type, data }),
      });
      const result = await res.json();
      if (result.success) {
        addLog(`Action ${type} completed successfully. Affected: ${result.count || 'N/A'}`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      addLog(`Action failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNuke = async () => {
    if (!selectedGuild) return;
    setIsLoading(true);
    addLog('INITIATING QUICK NUKE PROTOCOL...');
    try {
      const res = await fetch('/api/nuke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          isBot, 
          guildId: selectedGuild.id, 
          options: { 
            newName: newServerName,
            message: nukeMessage,
            channelCount: nukeChannelCount,
            firstChannelName: firstChannelName,
            channelNames: nukeChannelNames.split(',').map(s => s.trim()).filter(s => s),
            spamCount: nukeSpamCount,
            spamType: nukeSpamType
          } 
        }),
      });
      const result = await res.json();
      if (result.success) {
        result.results.forEach((r: any) => addLog(`> ${r.action}: ${r.count || r.name}`));
        addLog('QUICK NUKE COMPLETED.');
      }
    } catch (err: any) {
      addLog(`Nuke failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-matrix-dark">
        <div className="w-full max-w-md matrix-card">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-matrix-green/10 rounded-full flex items-center justify-center mb-4 border border-matrix-green">
              <Shield className="w-8 h-8 text-matrix-green" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-matrix-green">TROJAN CONTROL</h1>
            <div className="flex items-center gap-2 text-[10px] text-matrix-green/50 uppercase tracking-widest mt-2">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                serverStatus === 'online' ? "bg-matrix-green animate-pulse" : "bg-red-500"
              )} />
              {serverStatus === 'online' ? 'System Online' : 'System Offline'}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex gap-2 p-1 bg-matrix-dark border border-matrix-green/30 rounded">
              <button
                type="button"
                onClick={() => setIsBot(true)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all",
                  isBot ? "bg-matrix-green text-matrix-dark" : "text-matrix-green hover:bg-matrix-green/10"
                )}
              >
                BOT TOKEN
              </button>
              <button
                type="button"
                onClick={() => setIsBot(false)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all",
                  !isBot ? "bg-matrix-green text-matrix-dark" : "text-matrix-green hover:bg-matrix-green/10"
                )}
              >
                USER TOKEN
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Access Token</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setToken('')}
                    className="text-[10px] text-matrix-green/50 hover:text-red-500 uppercase tracking-tighter"
                  >
                    Clear
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[10px] text-matrix-green/50 hover:text-matrix-green uppercase tracking-tighter"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="MTA..."
                className={cn(
                  "w-full matrix-input",
                  loginError && "border-red-500 text-red-500"
                )}
              />
              {loginError && (
                <div className="flex items-center gap-2 text-[10px] text-red-500 mt-1 uppercase font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  {loginError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full matrix-button py-3 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              AUTHENTICATE
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-matrix-green/10 text-[10px] text-matrix-green/30 text-center uppercase tracking-widest">
            v8.0.0-PRO | .NET 8.0 CORE ENGINE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-matrix-dark">
      {/* Header */}
      <header className="h-16 border-b border-matrix-green/20 flex items-center justify-between px-6 bg-matrix-gray/30 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Shield className="w-6 h-6 text-matrix-green" />
          <div>
            <h2 className="text-sm font-bold tracking-tighter">TROJAN CONTROL</h2>
            <div className="flex items-center gap-2 text-[10px] text-matrix-green/50">
              <span className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-pulse" />
              SYSTEM ONLINE: {user?.username}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-matrix-green/50 uppercase">Active Server</div>
              <div className="text-xs font-bold">{selectedGuild?.name || 'NONE SELECTED'}</div>
            </div>
            <div className="w-8 h-8 rounded border border-matrix-green/30 bg-matrix-gray flex items-center justify-center overflow-hidden">
              {selectedGuild?.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`} alt="" referrerPolicy="no-referrer" />
              ) : (
                <Server className="w-4 h-4 text-matrix-green/30" />
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="p-2 hover:bg-matrix-green/10 text-matrix-green transition-colors rounded"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-matrix-green/10 flex flex-col bg-matrix-gray/20">
          <div className="p-4">
            <div className="text-[10px] text-matrix-green/30 uppercase tracking-widest mb-4">Navigation</div>
            <nav className="space-y-1">
              {[
                { id: 'QUICK_NUKE', icon: Zap, label: 'Quick Nuke' },
                { id: 'SPAM_ALL', icon: MessageSquare, label: 'Spam All' },
                { id: 'CHANNELS', icon: Layers, label: 'Channels' },
                { id: 'ROLES', icon: Shield, label: 'Roles' },
                { id: 'MEMBERS', icon: Users, label: 'Members' },
                { id: 'DM_SPAM', icon: Mail, label: 'DM Spam' },
                { id: 'CUSTOM_NAMES', icon: Edit3, label: 'Custom Names' },
                { id: 'TOOLS', icon: Settings, label: 'Tools' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as Section)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all uppercase tracking-wider",
                    activeSection === item.id 
                      ? "bg-matrix-green text-matrix-dark" 
                      : "text-matrix-green/70 hover:bg-matrix-green/10 hover:text-matrix-green"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-matrix-green/10">
            <div className="text-[10px] text-matrix-green/30 uppercase tracking-widest mb-4">Server List</div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
              {guilds.map((guild) => (
                <button
                  key={guild.id}
                  onClick={() => setSelectedGuild(guild)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-[10px] transition-all text-left",
                    selectedGuild?.id === guild.id 
                      ? "bg-matrix-green/20 text-matrix-green border-l-2 border-matrix-green" 
                      : "text-matrix-green/50 hover:bg-matrix-green/5 hover:text-matrix-green"
                  )}
                >
                  <div className="w-4 h-4 rounded-sm bg-matrix-gray flex-shrink-0 flex items-center justify-center overflow-hidden border border-matrix-green/20">
                    {guild.icon ? (
                      <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <Server className="w-2 h-2" />
                    )}
                  </div>
                  <span className="truncate">{guild.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {!selectedGuild && (
            <div className="absolute inset-0 bg-matrix-dark/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-matrix-green mx-auto mb-4 animate-bounce" />
                <h3 className="text-xl font-bold uppercase tracking-widest">Select a Target Server</h3>
                <p className="text-matrix-green/50 text-xs mt-2">Choose a server from the sidebar to begin operations</p>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-matrix-green/20 pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tighter uppercase">{activeSection.replace('_', ' ')}</h1>
                <p className="text-matrix-green/50 text-[10px] uppercase tracking-widest">Operation Module v8.0</p>
              </div>
              <div className="px-3 py-1 bg-matrix-green/10 border border-matrix-green/30 text-[10px] font-bold">
                STATUS: READY
              </div>
            </div>

            {/* Section Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSection === 'QUICK_NUKE' && (
                <div className="col-span-full matrix-card border-matrix-green/50 bg-matrix-green/5">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-6">
                      <div className="p-4 bg-matrix-green/20 rounded-full border border-matrix-green">
                        <Zap className="w-12 h-12 text-matrix-green" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">ROCKET MODE (ULTRA PARALLEL)</h3>
                        <p className="text-xs text-matrix-green/70 mb-4 leading-relaxed">
                          Executes a complete server wipe and takeover. Deletes all channels, changes server identity, grants admin permissions, and creates mass channels with spam.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Spam Message</label>
                        <textarea 
                          value={nukeMessage}
                          onChange={(e) => setNukeMessage(e.target.value)}
                          className="w-full matrix-input h-24 text-xs resize-none"
                          placeholder="Enter nuke message..."
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Channel Count</label>
                          <input 
                            type="number" 
                            value={nukeChannelCount}
                            onChange={(e) => setNukeChannelCount(parseInt(e.target.value) || 0)}
                            className="w-full matrix-input text-xs"
                            placeholder="60"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Messages per Channel</label>
                          <input 
                            type="number" 
                            value={nukeSpamCount}
                            onChange={(e) => setNukeSpamCount(parseInt(e.target.value) || 0)}
                            className="w-full matrix-input text-xs"
                            placeholder="5"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">First Channel Name (Special)</label>
                          <input 
                            type="text" 
                            value={firstChannelName}
                            onChange={(e) => setFirstChannelName(e.target.value)}
                            className="w-full matrix-input text-xs"
                            placeholder="hello-trojan-was-here"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Channel Names (Comma Separated)</label>
                          <input 
                            type="text" 
                            value={nukeChannelNames}
                            onChange={(e) => setNukeChannelNames(e.target.value)}
                            className="w-full matrix-input text-xs"
                            placeholder="name1, name2, name3"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">New Server Name</label>
                          <input 
                            type="text" 
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                            className="w-full matrix-input text-xs"
                            placeholder="NUKED BY TROJAN"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase tracking-widest text-matrix-green/70 font-bold">نوع السبام (Spam Type)</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setNukeSpamType('NORMAL')}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 border rounded transition-all",
                                nukeSpamType === 'NORMAL' 
                                  ? "bg-matrix-green border-matrix-green text-matrix-dark shadow-[0_0_15px_rgba(0,255,65,0.3)]" 
                                  : "bg-matrix-dark/50 border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10"
                              )}
                            >
                              <MessageSquare className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase">سبام عادي</span>
                              <span className="text-[8px] opacity-70">Normal Bot Spam</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNukeSpamType('WEBHOOK')}
                              className={cn(
                                "flex flex-col items-center gap-2 p-3 border rounded transition-all",
                                nukeSpamType === 'WEBHOOK' 
                                  ? "bg-matrix-green border-matrix-green text-matrix-dark shadow-[0_0_15px_rgba(0,255,65,0.3)]" 
                                  : "bg-matrix-dark/50 border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10"
                              )}
                            >
                              <Zap className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase">سبام ويب هوك</span>
                              <span className="text-[8px] opacity-70">Webhook Ultra Spam</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleNuke}
                      disabled={isLoading}
                      className="matrix-button w-full py-4 text-sm bg-matrix-green text-matrix-dark hover:bg-matrix-green/80 font-black"
                    >
                      {isLoading ? 'EXECUTING PROTOCOL...' : 'INITIATE TOTAL DESTRUCTION'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'SPAM_ALL' && (
                <>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Normal Spam
                    </h3>
                    <textarea 
                      value={spamMsg}
                      onChange={(e) => setSpamMsg(e.target.value)}
                      placeholder="Enter spam message..."
                      className="w-full matrix-input h-24 text-xs resize-none"
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Messages per Channel</label>
                      <input 
                        type="number" 
                        value={spamCount}
                        onChange={(e) => setSpamCount(parseInt(e.target.value) || 0)}
                        className="w-full matrix-input text-xs"
                        placeholder="10"
                      />
                    </div>
                    <button 
                      onClick={() => handleAction('SPAM', { message: spamMsg, count: spamCount })}
                      className="matrix-button w-full"
                    >
                      Start Normal Spam
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Webhook Spam
                    </h3>
                    <p className="text-[10px] text-matrix-green/50">Creates webhooks in all channels for maximum speed spamming.</p>
                    <button 
                      onClick={() => handleAction('WEBHOOK_SPAM', { message: spamMsg, count: spamCount })}
                      className="matrix-button w-full"
                    >
                      Start Webhook Spam
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'CHANNELS' && (
                <>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Create</h3>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="Channel Name" 
                        className="w-full matrix-input text-xs" 
                      />
                      <input 
                        type="number" 
                        value={channelAmount}
                        onChange={(e) => setChannelAmount(parseInt(e.target.value) || 0)}
                        placeholder="Amount" 
                        className="w-full matrix-input text-xs" 
                      />
                    </div>
                    <button 
                      onClick={() => handleAction('CREATE_CHANNELS', { name: channelName, amount: channelAmount })}
                      className="matrix-button w-full"
                    >
                      Create Channels
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Delete</h3>
                    <p className="text-[10px] text-matrix-green/50">Instantly deletes all existing channels in the server.</p>
                    <button 
                      onClick={() => handleAction('DELETE_CHANNELS')}
                      className="matrix-button w-full border-red-500 text-red-500 hover:bg-red-500"
                    >
                      Delete All Channels
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'ROLES' && (
                <>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Admin Everyone</h3>
                    <p className="text-[10px] text-matrix-green/50">Grants Administrator permissions to the @everyone role.</p>
                    <button 
                      onClick={() => handleAction('ADMIN_EVERYONE')}
                      className="matrix-button w-full"
                    >
                      Grant Admin
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Roles</h3>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="Role Name" 
                        className="w-full matrix-input text-xs" 
                      />
                      <input 
                        type="number" 
                        value={roleAmount}
                        onChange={(e) => setRoleAmount(parseInt(e.target.value) || 0)}
                        placeholder="Amount" 
                        className="w-full matrix-input text-xs" 
                      />
                    </div>
                    <button 
                      onClick={() => handleAction('CREATE_ROLES', { name: roleName, amount: roleAmount })}
                      className="matrix-button w-full"
                    >
                      Create Roles
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Delete Roles</h3>
                    <p className="text-[10px] text-matrix-green/50">Deletes all roles except @everyone and managed roles.</p>
                    <button 
                      onClick={() => handleAction('DELETE_ROLES')}
                      className="matrix-button w-full border-red-500 text-red-500 hover:bg-red-500"
                    >
                      Delete All Roles
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'MEMBERS' && (
                <>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Ban</h3>
                    <p className="text-[10px] text-matrix-green/50">Bans every member from the server (requires permissions).</p>
                    <button 
                      onClick={() => handleAction('BAN_ALL')}
                      className="matrix-button w-full border-red-500 text-red-500 hover:bg-red-500"
                    >
                      Ban All Members
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Kick</h3>
                    <p className="text-[10px] text-matrix-green/50">Kicks every member from the server.</p>
                    <button 
                      onClick={() => handleAction('KICK_ALL')}
                      className="matrix-button w-full border-red-500 text-red-500 hover:bg-red-500"
                    >
                      Kick All Members
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Mass Unban</h3>
                    <p className="text-[10px] text-matrix-green/50">Unbans everyone on the server's ban list.</p>
                    <button 
                      onClick={() => handleAction('UNBAN_ALL')}
                      className="matrix-button w-full"
                    >
                      Unban All
                    </button>
                  </div>
                </>
              )}

              {activeSection === 'DM_SPAM' && (
                <div className="col-span-full matrix-card space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-widest">Mass Direct Message</h3>
                  <textarea 
                    value={dmMsg}
                    onChange={(e) => setDmMsg(e.target.value)}
                    placeholder="Enter DM message..."
                    className="w-full matrix-input h-32 text-xs resize-none"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleAction('DM_ALL', { message: dmMsg })}
                      className="matrix-button flex-1"
                    >
                      Spam All Members
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'CUSTOM_NAMES' && (
                <div className="col-span-full matrix-card p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-matrix-green/30 pb-3">
                    <Edit3 className="w-5 h-5 text-matrix-green" />
                    <h2 className="text-sm font-bold tracking-[0.2em] uppercase">تغيير أسماء مخصصة</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Channel Rename Name</label>
                        <input 
                          type="text" 
                          value={customRenameChannel}
                          onChange={(e) => setCustomRenameChannel(e.target.value)}
                          className="w-full matrix-input text-xs"
                        />
                        <button 
                          onClick={() => handleAction('RENAME_CHANNELS', { name: customRenameChannel })}
                          disabled={isLoading}
                          className="matrix-button w-full py-2 text-[10px]"
                        >
                          تغيير أسماء الرومات
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Role Rename Name</label>
                        <input 
                          type="text" 
                          value={customRenameRole}
                          onChange={(e) => setCustomRenameRole(e.target.value)}
                          className="w-full matrix-input text-xs"
                        />
                        <button 
                          onClick={() => handleAction('RENAME_ROLES', { name: customRenameRole })}
                          disabled={isLoading}
                          className="matrix-button w-full py-2 text-[10px]"
                        >
                          تغيير أسماء الرتب
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-matrix-green/70">Random Names List (Comma Separated)</label>
                        <textarea 
                          value={randomRenameList}
                          onChange={(e) => setRandomRenameList(e.target.value)}
                          className="w-full matrix-input text-xs min-h-[100px] resize-none"
                        />
                        <button 
                          onClick={() => handleAction('RANDOM_RENAME_CHANNELS', { names: randomRenameList.split(',').map(s => s.trim()).filter(s => s) })}
                          disabled={isLoading}
                          className="matrix-button w-full py-2 text-[10px] flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          تغيير أسماء عشوائية
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'TOOLS' && (
                <>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Server Identity</h3>
                    <input 
                      type="text" 
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      placeholder="New Server Name" 
                      className="w-full matrix-input text-xs" 
                    />
                    <button 
                      onClick={() => handleAction('UPDATE_IDENTITY', { name: newServerName })}
                      className="matrix-button w-full"
                    >
                      Update Identity
                    </button>
                  </div>
                  <div className="matrix-card space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest">Cleanup</h3>
                    <button 
                      onClick={() => handleAction('DELETE_EMOJIS')}
                      className="matrix-button w-full border-red-500 text-red-500 hover:bg-red-500"
                    >
                      Delete All Emojis
                    </button>
                    <button 
                      onClick={() => handleAction('RANDOM_ICON')}
                      className="matrix-button w-full"
                    >
                      Randomize Icon
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Logs Sidebar */}
        <aside className="w-80 border-l border-matrix-green/10 flex flex-col bg-matrix-gray/30">
          <div className="p-4 border-b border-matrix-green/10 flex items-center justify-between">
            <div className="text-[10px] text-matrix-green/30 uppercase tracking-widest">Console Logs</div>
            <Terminal className="w-3 h-3 text-matrix-green/30" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1">
            {logs.length === 0 && <div className="text-matrix-green/20 italic">Waiting for input...</div>}
            {logs.map((log, i) => (
              <div key={i} className={cn(
                "break-words",
                log.includes('failed') || log.includes('Error') ? "text-red-500" : 
                log.includes('SUCCESS') || log.includes('COMPLETED') ? "text-matrix-green font-bold" : "text-matrix-green/70"
              )}>
                {log}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-matrix-green/10 bg-matrix-dark/50">
            <div className="flex items-center justify-between text-[8px] uppercase tracking-tighter text-matrix-green/30">
              <span>CPU: 12%</span>
              <span>MEM: 256MB</span>
              <span>PING: 24MS</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
