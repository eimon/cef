"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Pencil, ShieldX, Trash2, X } from "lucide-react";

import {
    approveLicencia,
    createLicencia,
    deleteLicencia,
    getLicencias,
    rejectLicencia,
    updateLicencia,
    type LicenciaFormState,
} from "@/actions/licencias";
import { useToast } from "@/context/ToastContext";
import { EstadoLicencia, Licencia, Profesor, TipoLicencia } from "@/types/api";

interface LicenciasSectionProps {
    profesores: Profesor[];
}

const initialState: LicenciaFormState = {};

type DecisionMode = "approve" | "reject";

type EditFormState = {
    fecha_inicio: string;
    fecha_fin: string;
    tipo: TipoLicencia;
    motivo: string;
    profesor_reemplazo_id: string;
};

const badgeByEstado: Record<EstadoLicencia, string> = {
    [EstadoLicencia.PENDIENTE]: "bg-cef-warning/10 text-cef-warning",
    [EstadoLicencia.APROBADA]: "bg-cef-success/10 text-cef-success",
    [EstadoLicencia.RECHAZADA]: "bg-cef-danger/10 text-cef-danger",
};

export default function LicenciasSection({ profesores }: LicenciasSectionProps) {
    const [licencias, setLicencias] = useState<Licencia[]>([]);
    const [estadoFilter, setEstadoFilter] = useState<string>("");
    const [profesorSeleccionado, setProfesorSeleccionado] = useState<string>("");
    const [isActionPending, setIsActionPending] = useState(false);
    const [decisionTarget, setDecisionTarget] = useState<Licencia | null>(null);
    const [decisionMode, setDecisionMode] = useState<DecisionMode>("approve");
    const [decisionNotes, setDecisionNotes] = useState("");
    const [decisionReemplazo, setDecisionReemplazo] = useState("");
    const [editTarget, setEditTarget] = useState<Licencia | null>(null);
    const [editForm, setEditForm] = useState<EditFormState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showError, showSuccess } = useToast();

    const [formState, formAction, isPending] = useActionState(createLicencia, initialState);

    const profesorNameMap = useMemo(() => {
        return new Map(
            profesores.map((profesor) => [profesor.id, `${profesor.nombre} ${profesor.apellido}`])
        );
    }, [profesores]);

    const refresh = async () => {
        setIsLoading(true);
        const data = await getLicencias(
            estadoFilter ? { estado: estadoFilter as EstadoLicencia } : {}
        );
        setLicencias(data);
        setIsLoading(false);
    };

    useEffect(() => {
        refresh();
    }, [estadoFilter]);

    useEffect(() => {
        if (formState.success) {
            showSuccess("Licencia creada correctamente");
            setProfesorSeleccionado("");
            refresh();
        } else if (formState.error) {
            showError(formState.error);
        }
    }, [formState.success, formState.error]);

    const handleApprove = async (licencia: Licencia) => {
        setDecisionMode("approve");
        setDecisionTarget(licencia);
        setDecisionNotes("");
        setDecisionReemplazo(licencia.profesor_reemplazo_id ?? "");
    };

    const handleReject = async (licencia: Licencia) => {
        setDecisionMode("reject");
        setDecisionTarget(licencia);
        setDecisionNotes("");
        setDecisionReemplazo("");
    };

    const submitDecision = async () => {
        if (!decisionTarget) return;

        setIsActionPending(true);
        const result =
            decisionMode === "approve"
                ? await approveLicencia(decisionTarget.id, {
                    notas_admin: decisionNotes || undefined,
                    profesor_reemplazo_id: decisionReemplazo || undefined,
                })
                : await rejectLicencia(decisionTarget.id, {
                    notas_admin: decisionNotes || undefined,
                });
        setIsActionPending(false);

        if (result.error) {
            showError(result.error);
            return;
        }

        showSuccess(decisionMode === "approve" ? "Licencia aprobada" : "Licencia rechazada");
        setDecisionTarget(null);
        refresh();
    };

    const handleEdit = (licencia: Licencia) => {
        setEditTarget(licencia);
        setEditForm({
            fecha_inicio: licencia.fecha_inicio,
            fecha_fin: licencia.fecha_fin,
            tipo: licencia.tipo,
            motivo: licencia.motivo ?? "",
            profesor_reemplazo_id: licencia.profesor_reemplazo_id ?? "",
        });
    };

    const submitEdit = async () => {
        if (!editTarget || !editForm) return;

        setIsActionPending(true);
        const result = await updateLicencia(editTarget.id, {
            fecha_inicio: editForm.fecha_inicio,
            fecha_fin: editForm.fecha_fin,
            tipo: editForm.tipo,
            motivo: editForm.motivo || undefined,
            profesor_reemplazo_id: editForm.profesor_reemplazo_id || undefined,
        });
        setIsActionPending(false);

        if (result.error) {
            showError(result.error);
            return;
        }

        showSuccess("Licencia actualizada");
        setEditTarget(null);
        setEditForm(null);
        refresh();
    };

    const handleDelete = async (licencia: Licencia) => {
        const result = await deleteLicencia(licencia.id);
        if (result.error) {
            showError(result.error);
            return;
        }
        showSuccess("Licencia eliminada");
        refresh();
    };

    return (
        <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Licencias</h2>
                    <p className="text-sm text-slate-500">Gestioná vacaciones, enfermedad y otros motivos.</p>
                </div>
                <div className="w-full sm:w-52">
                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Estado</label>
                    <select
                        value={estadoFilter}
                        onChange={(event) => setEstadoFilter(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                        <option value="">Todos</option>
                        <option value={EstadoLicencia.PENDIENTE}>Pendiente</option>
                        <option value={EstadoLicencia.APROBADA}>Aprobada</option>
                        <option value={EstadoLicencia.RECHAZADA}>Rechazada</option>
                    </select>
                </div>
            </div>

            <div className="glass rounded-xl p-4">
                <form action={formAction} className="grid gap-3 md:grid-cols-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Profesor</label>
                        <select
                            name="profesor_id"
                            required
                            value={profesorSeleccionado}
                            onChange={(event) => setProfesorSeleccionado(event.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="">Seleccionar profesor</option>
                            {profesores.map((profesor) => (
                                <option key={profesor.id} value={profesor.id}>{profesor.nombre} {profesor.apellido}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Desde</label>
                        <input name="fecha_inicio" type="date" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Hasta</label>
                        <input name="fecha_fin" type="date" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Tipo</label>
                        <select name="tipo" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <option value={TipoLicencia.VACACIONES}>Vacaciones</option>
                            <option value={TipoLicencia.ENFERMEDAD}>Enfermedad</option>
                            <option value={TipoLicencia.PERSONAL}>Personal</option>
                            <option value={TipoLicencia.ESTUDIO}>Estudio</option>
                            <option value={TipoLicencia.OTRO}>Otro</option>
                        </select>
                    </div>
                    <div className="md:col-span-6">
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Profesor reemplazo</label>
                        <select
                            name="profesor_reemplazo_id"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="">Sin reemplazo</option>
                            {profesores
                                .filter((profesor) => profesor.id !== profesorSeleccionado)
                                .map((profesor) => (
                                    <option key={profesor.id} value={profesor.id}>
                                        {profesor.nombre} {profesor.apellido}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className="md:col-span-6">
                        <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Motivo</label>
                        <input name="motivo" type="text" placeholder="Opcional" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />
                    </div>
                    <div className="md:col-span-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="inline-flex items-center rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {isPending ? "Guardando..." : "Crear licencia"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="glass rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-sm text-slate-500">Cargando licencias...</div>
                ) : licencias.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No hay licencias para los filtros seleccionados.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Profesor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Rango</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {licencias.map((licencia) => (
                                    <tr key={licencia.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {profesorNameMap.get(licencia.profesor_id) || "Profesor"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">
                                            {licencia.fecha_inicio} a {licencia.fecha_fin}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 capitalize">{licencia.tipo}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeByEstado[licencia.estado]}`}>
                                                {licencia.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {licencia.estado === EstadoLicencia.PENDIENTE && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(licencia)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-cef-success/30 bg-cef-success/10 px-2.5 py-1 text-xs font-medium text-cef-success"
                                                        >
                                                            <Check size={12} /> Aprobar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(licencia)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-cef-danger/30 bg-cef-danger/10 px-2.5 py-1 text-xs font-medium text-cef-danger"
                                                        >
                                                            <ShieldX size={12} /> Rechazar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(licencia)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                                                        >
                                                            <Pencil size={12} /> Editar
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(licencia)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                                                >
                                                    <Trash2 size={12} /> Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-cef-warning/30 bg-cef-warning/10 p-3 text-xs text-slate-600 flex items-start gap-2">
                <Clock3 size={14} className="mt-0.5 text-cef-warning" />
                Si no se informa un reemplazo disponible, la licencia aprobada queda pendiente de resolución manual en operación.
            </div>

            {decisionTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">
                                {decisionMode === "approve" ? "Aprobar licencia" : "Rechazar licencia"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setDecisionTarget(null)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Notas administrativas</label>
                                <textarea
                                    value={decisionNotes}
                                    onChange={(event) => setDecisionNotes(event.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    placeholder="Opcional"
                                />
                            </div>
                            {decisionMode === "approve" && (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Profesor reemplazo</label>
                                    <select
                                        value={decisionReemplazo}
                                        onChange={(event) => setDecisionReemplazo(event.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    >
                                        <option value="">Sin reemplazo</option>
                                        {profesores
                                            .filter((profesor) => profesor.id !== decisionTarget.profesor_id)
                                            .map((profesor) => (
                                                <option key={profesor.id} value={profesor.id}>
                                                    {profesor.nombre} {profesor.apellido}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDecisionTarget(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={submitDecision}
                                    disabled={isActionPending}
                                    className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 text-sm font-medium transition-colors"
                                >
                                    {isActionPending ? "Guardando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editTarget && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Editar licencia</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditTarget(null);
                                    setEditForm(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Desde</label>
                                    <input
                                        type="date"
                                        value={editForm.fecha_inicio}
                                        onChange={(event) => setEditForm((prev) => prev ? { ...prev, fecha_inicio: event.target.value } : prev)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Hasta</label>
                                    <input
                                        type="date"
                                        value={editForm.fecha_fin}
                                        onChange={(event) => setEditForm((prev) => prev ? { ...prev, fecha_fin: event.target.value } : prev)}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Tipo</label>
                                <select
                                    value={editForm.tipo}
                                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, tipo: event.target.value as TipoLicencia } : prev)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                    <option value={TipoLicencia.VACACIONES}>Vacaciones</option>
                                    <option value={TipoLicencia.ENFERMEDAD}>Enfermedad</option>
                                    <option value={TipoLicencia.PERSONAL}>Personal</option>
                                    <option value={TipoLicencia.ESTUDIO}>Estudio</option>
                                    <option value={TipoLicencia.OTRO}>Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Profesor reemplazo</label>
                                <select
                                    value={editForm.profesor_reemplazo_id}
                                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, profesor_reemplazo_id: event.target.value } : prev)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                    <option value="">Sin reemplazo</option>
                                    {profesores
                                        .filter((profesor) => profesor.id !== editTarget.profesor_id)
                                        .map((profesor) => (
                                            <option key={profesor.id} value={profesor.id}>
                                                {profesor.nombre} {profesor.apellido}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Motivo</label>
                                <textarea
                                    value={editForm.motivo}
                                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, motivo: event.target.value } : prev)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditTarget(null);
                                        setEditForm(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={submitEdit}
                                    disabled={isActionPending}
                                    className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 text-sm font-medium transition-colors"
                                >
                                    {isActionPending ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
