"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Users, UserSearch, X, Copy, Send, CheckCircle2, Loader2, User, Clock, ShieldAlert, Trash2, AlertTriangle, BellRing, ChevronRight } from "lucide-react";
import { auth, db } from "../../../../lib/firebase";
import { collection, query, where, getDocs, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, Firestore } from "firebase/firestore";
import { enviarNotificacion } from "../../../../lib/notificaciones";
import DetallesCliente from "./detallesclientes"; // 🔴 Importamos el nuevo submódulo

interface ListaClientesProps {
  trainerCodeShort: string;
}

export default function ListaClientesModule({ trainerCodeShort }: ListaClientesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [sysAlert, setSysAlert] = useState<{ text: string, type: 'success' | 'warning' } | null>(null);

  const mostrarAlerta = (text: string, type: 'success' | 'warning' = 'success') => {
    setSysAlert({ text, type });
    setTimeout(() => setSysAlert(null), 3000);
  };
  
  const [clientes, setClientes] = useState<any[]>([]); 
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // ESTADO: Cliente seleccionado
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const [inviteSearch, setInviteSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qClientes = query(
      collection(db, "users"),
      where("entrenadoresActivos", "array-contains", user.uid)
    );

    const unsubClientes = onSnapshot(qClientes, (snapshot) => {
      const activos = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setClientes(activos);
      
      if (selectedClient) {
        const updated = activos.find(c => c.uid === selectedClient.uid);
        if (updated) setSelectedClient(updated);
        else setSelectedClient(null); 
      }
    });

    return () => unsubClientes();
  }, [selectedClient]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qPendientes = query(
      collection(db, "users", user.uid, "solicitudes_enviadas"),
      orderBy("fecha", "desc")
    );

    const unsubPendientes = onSnapshot(qPendientes, (snapshot) => {
      const pendientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingInvites(pendientes);
    });

    return () => unsubPendientes();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || clientes.length === 0 || pendingInvites.length === 0) return;

    const limpiarAceptados = async () => {
      for (const cliente of clientes) {
        const match = pendingInvites.find(inv => inv.clienteUid === cliente.uid);
        if (match) {
          try {
            await deleteDoc(doc(db, "users", user.uid, "solicitudes_enviadas", match.id));
            mostrarAlerta(`¡@${cliente.username} se unió a tu equipo!`, "success");
          } catch (e) {
            console.error("Error auto-limpiando solicitud:", e);
          }
        }
      }
    };

    limpiarAceptados();
  }, [clientes, pendingInvites]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trainerCodeShort);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buscarUsuarioExacto = async () => {
    if (!inviteSearch.trim()) return;
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const exactUsername = inviteSearch.trim().toLowerCase();
      const q = query(collection(db, "users"), where("username", "==", exactUsername));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userData = snap.docs[0].data();
        if (snap.docs[0].id === auth.currentUser?.uid) {
          setSearchError("No puedes invitarte a ti mismo.");
          setIsSearching(false);
          return;
        }
        if (clientes.some(c => c.uid === snap.docs[0].id)) {
          setSearchError("Este usuario ya pertenece a tu equipo.");
          setIsSearching(false);
          return;
        }
        setSearchResult({
          uid: snap.docs[0].id,
          username: userData.username,
          fotoPerfil: userData.fotoPerfil || null,
        });
      } else {
        setSearchError("Usuario no encontrado. Asegúrate de escribir el nombre exacto.");
      }
    } catch (error) {
      console.error("Error buscando usuario:", error);
      setSearchError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSearching(false);
    }
  };

  const confirmarYEnviarInvitacion = async () => {
    if (!searchResult) return;
    const entrenador = auth.currentUser;
    if (!entrenador) return;

    const yaEnviada = pendingInvites.some(inv => inv.clienteUid === searchResult.uid);
    if (yaEnviada) {
      mostrarAlerta("Ya tienes una solicitud pendiente con este usuario.", "warning");
      setShowConfirmModal(false);
      return;
    }

    setIsInviting(true);
    try {
      const exito = await enviarNotificacion(
        searchResult.uid,
        "¡Nueva Invitación de Entrenador!",
        "Un entrenador te ha invitado a unirte a su equipo. Al aceptar, podrá asignarte rutinas.",
        "invitacion",
        { entrenadorId: entrenador.uid }
      );

      if (exito) {
        await addDoc(collection(db, "users", entrenador.uid, "solicitudes_enviadas"), {
          clienteUid: searchResult.uid,
          username: searchResult.username,
          fotoPerfil: searchResult.fotoPerfil,
          estado: "pendiente",
          fecha: serverTimestamp()
        });
        
        setShowConfirmModal(false);
        setSearchResult(null);
        setInviteSearch("");
        mostrarAlerta("¡Invitación enviada con éxito!");
      } else {
        mostrarAlerta("Hubo un error al enviar la invitación.", "warning");
      }
    } catch (error) {
      console.error("Error enviando:", error);
      mostrarAlerta("Error del servidor.", "warning");
    } finally {
      setIsInviting(false);
    }
  };

  const cancelarInvitacion = async (solicitudId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "solicitudes_enviadas", solicitudId));
      mostrarAlerta("Invitación cancelada.", "success");
    } catch (error) {
      console.error("Error al cancelar la invitación:", error);
      mostrarAlerta("Error al cancelar.", "warning");
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 relative">
      
      {sysAlert && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[500] border rounded-full py-3 px-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-5 shadow-2xl ${
          sysAlert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
          : 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]'
        }`}>
          {sysAlert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{sysAlert.text}</p>
        </div>
      )}

      {/* HEADER & CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar en mis clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cyan-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowPendingModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 relative"
          >
            <Clock className="w-4 h-4" /> Pendientes
            {pendingInvites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></span>
            )}
          </button>
          
          <button 
            onClick={() => { setShowInviteModal(true); setSearchResult(null); setInviteSearch(""); setSearchError(""); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Invitar
          </button>
        </div>
      </div>

      {/* TARJETAS DE CLIENTES ACTIVOS */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2 pb-10">
        {clientesFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 py-10 animate-in zoom-in-95 duration-500">
            <div className="bg-zinc-900/50 p-6 rounded-full mb-6 border border-zinc-800 ring-1 ring-white/5 shadow-2xl">
              <UserSearch className="w-12 h-12 text-zinc-600" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">
              {searchTerm ? "No se encontraron clientes" : "Aún no tienes clientes"}
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium max-w-xs leading-relaxed mb-6">
              {searchTerm ? "Intenta buscar con otro término." : "Busca el usuario exacto de tu cliente o compártele tu código pro para que se una a tu equipo."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientesFiltrados.map((cliente) => (
              <div 
                key={cliente.uid} 
                onClick={() => setSelectedClient(cliente)}
                className="bg-zinc-950/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/50 hover:bg-white/5 transition-all group shadow-[0_0_15px_rgba(0,0,0,0.3)] cursor-pointer"
              >
                <div className="w-12 h-12 bg-black rounded-full overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center">
                  {cliente.fotoPerfil ? (
                    <img src={cliente.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-zinc-500" />
                  )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-white font-black text-sm truncate flex items-center gap-1.5 group-hover:text-white transition-colors drop-shadow-md">
                    @{cliente.username}
                  </h4>
                  <div className="flex gap-1 mt-1">
                    {cliente.objetivos && cliente.objetivos.length > 0 ? (
                      cliente.objetivos.slice(0,2).map((obj: string, i: number) => (
                        <span key={i} className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest truncate max-w-[80px]">
                          {obj}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Sin objetivos</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 p-2 text-zinc-500 group-hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 MODAL DEL EXPEDIENTE DEL CLIENTE EXTRAÍDO */}
      {selectedClient && (
        <DetallesCliente 
          cliente={selectedClient} 
          onClose={() => setSelectedClient(null)} 
          mostrarAlerta={mostrarAlerta} 
        />
      )}

      {/* MODALES DE INVITACIÓN */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl w-full max-w-md flex flex-col shadow-[0_0_60px_rgba(255,255,255,0.1)] overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-full border border-white/20">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Añadir al Equipo</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:text-white p-2 bg-zinc-900 rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full">
                  Buscador Exacto de Usuarios
                </span>
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-1.5 focus-within:border-white transition-all shadow-inner">
                  <span className="text-white font-black mr-1 text-sm">@</span>
                  <input 
                    type="text" 
                    placeholder="nombredeusuario"
                    value={inviteSearch}
                    onChange={(e) => {
                      const formatted = e.target.value.toLowerCase().replace(/\s/g, '');
                      setInviteSearch(formatted);
                      setSearchResult(null);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && buscarUsuarioExacto()}
                    className="flex-1 bg-transparent border-none outline-none text-white text-xs font-mono py-2 placeholder:text-zinc-600"
                  />
                  <button 
                    onClick={buscarUsuarioExacto}
                    disabled={isSearching || !inviteSearch.trim()}
                    className="bg-white text-black p-2 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>

                {searchError && (
                  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl animate-in fade-in zoom-in-95">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <p className="text-[10px] text-rose-400 font-medium leading-relaxed">{searchError}</p>
                  </div>
                )}

                {searchResult && (
                  <div className="bg-black border border-white/40 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-2 fade-in shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <div className="w-14 h-14 bg-zinc-900 rounded-full border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {searchResult.fotoPerfil ? (
                        <img src={searchResult.fotoPerfil} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-white font-black text-sm truncate">@{searchResult.username}</h4>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Usuario Verificado</p>
                    </div>
                    <button 
                      onClick={() => setShowConfirmModal(true)}
                      className="shrink-0 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    >
                      Invitar
                    </button>
                  </div>
                )}
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">O COMPARTE</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Tu Código Pro</span>
                <div className="font-mono text-2xl font-black text-white tracking-[0.3em] text-center drop-shadow-md">
                  {trainerCodeShort || "----"}
                </div>
                <button 
                  onClick={handleCopyCode}
                  className={`w-full py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all flex justify-center items-center gap-2 ${
                    copied ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Código</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && searchResult && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/50 rounded-3xl w-full max-w-sm flex flex-col shadow-[0_0_80px_rgba(255,255,255,0.15)] text-center p-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-full border border-white/50 mx-auto mb-4 overflow-hidden flex items-center justify-center">
              {searchResult.fotoPerfil ? (
                <img src={searchResult.fotoPerfil} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-zinc-500" />
              )}
            </div>
            <h3 className="text-lg font-black text-white mb-2">¿Invitar a <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">@{searchResult.username}</span>?</h3>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mb-8">
              Esta persona recibirá una notificación. Si acepta, se unirá a tu lista de clientes activos y podrás asignarle rutinas.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={isInviting}
                className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarYEnviarInvitacion}
                disabled={isInviting}
                className="flex-1 bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-700/50 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Enviadas</h3>
              </div>
              <button onClick={() => setShowPendingModal(false)} className="text-zinc-400 hover:text-white p-2 bg-zinc-900 rounded-full transition-colors active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {pendingInvites.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Sin Pendientes</p>
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium">No has enviado ninguna invitación.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-full overflow-hidden border border-zinc-700 flex-shrink-0 flex items-center justify-center">
                          {inv.fotoPerfil ? <img src={inv.fotoPerfil} className="w-full h-full object-cover"/> : <User className="w-5 h-5 text-zinc-600"/>}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate w-32">@{inv.username}</p>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Esperando...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-white opacity-50 animate-pulse group-hover:hidden block" />
                        <button 
                          onClick={() => cancelarInvitacion(inv.id)}
                          className="hidden group-hover:flex bg-rose-500/20 text-rose-500 p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"
                          title="Cancelar Invitación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function doc(db: Firestore, arg1: string, uid: string, arg3: string, id: any): import("@firebase/firestore").DocumentReference<unknown, import("@firebase/firestore").DocumentData> {
  throw new Error("Function not implemented.");
}
