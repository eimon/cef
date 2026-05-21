import { serverApi } from "@/lib/server-api";
import { MedicalRecordProfile, User } from "@/types/api";
import PersonalDataEditForm from "@/components/PersonalDataEditForm";
import MedicalRecordEditForm from "@/components/MedicalRecordEditForm";
import Link from "next/link";
import type { ReactNode } from "react";
import ChangeEmailForm from "@/components/ChangeEmailForm";
import ProfilePasswordResetButton from "@/components/ProfilePasswordResetButton";
import {
    Ambulance,
    CalendarDays,
    ClipboardList,
    Dumbbell,
    HeartPulse,
    IdCard,
    LockKeyhole,
    Mail,
    Pencil,
    Phone,
    Pill,
    Stethoscope,
    UserRound,
} from "lucide-react";

type ProfileSection = "cuenta" | "datos-personales" | "ficha-medica";

const sectionOptions: {
    id: ProfileSection;
    label: string;
    description: string;
    icon: ReactNode;
}[] = [
    {
        id: "cuenta",
        label: "Cuenta",
        description: "Email y contraseña",
        icon: <Mail size={18} />,
    },
    {
        id: "datos-personales",
        label: "Datos personales",
        description: "Informacion registrada",
        icon: <IdCard size={18} />,
    },
    {
        id: "ficha-medica",
        label: "Ficha medica",
        description: "Datos de salud",
        icon: <HeartPulse size={18} />,
    },
];

async function getProfile(): Promise<User | null> {
    try {
        const res = await serverApi("/auth/perfil");
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

async function getMedicalRecord(): Promise<MedicalRecordProfile | null> {
    try {
        const res = await serverApi("/auth/perfil/ficha-medica");
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

function formatDate(value?: string | null): string {
    if (!value) return "No informado";
    const [year, month, day] = value.split("T")[0].split("-").map(Number);
    if (!year || !month || !day) return "No informado";
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(year, month - 1, day));
}

function valueOrFallback(value?: string | null): string {
    return value && value.trim() ? value : "No informado";
}

function Field({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: ReactNode;
}) {
    return (
        <div className="glass rounded-xl p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-400">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{value}</p>
        </div>
    );
}

function SectionCard({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cef-primary/10 text-cef-primary">
                    {icon}
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function ProfileSectionSelector({ activeSection }: { activeSection: ProfileSection }) {
    return (
        <div className="grid gap-3 md:grid-cols-3">
            {sectionOptions.map((section) => {
                const isActive = activeSection === section.id;

                return (
                    <Link
                        key={section.id}
                        href={`/profile?seccion=${section.id}`}
                        aria-current={isActive ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all ${isActive
                            ? "border-cef-primary bg-cef-primary text-white shadow-lg shadow-cef-primary/20"
                            : "glass border-slate-200 text-slate-600 hover:border-cef-primary/40 hover:bg-cef-primary/5 hover:text-slate-800"
                            }`}
                    >
                        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${isActive
                            ? "bg-white/20 text-white"
                            : "bg-cef-primary/10 text-cef-primary group-hover:bg-cef-primary/15"
                            }`}
                        >
                            {section.icon}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-bold">{section.label}</span>
                            <span className={`block text-xs ${isActive ? "text-white/75" : "text-slate-400"}`}>
                                {section.description}
                            </span>
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}

function AccountSection({ profile }: { profile: User | null }) {
    return (
        <section className="glass rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cef-primary text-white">
                    <UserRound size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Cuenta</h2>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <ChangeEmailForm currentEmail={profile?.email} />
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary/10 text-cef-primary">
                            <LockKeyhole size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-800">Contraseña</h3>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">********</p>
                            </div>

                            <ProfilePasswordResetButton email={profile?.email} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PersonalDataSection({ profile }: { profile: User | null }) {
    return (
        <section className="glass rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cef-primary/10 text-cef-primary">
                    <IdCard size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Datos personales</h2>
                    <p className="text-sm text-slate-400">Informacion registrada en tu cuenta</p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="DNI" value={valueOrFallback(profile?.dni)} icon={<IdCard size={15} />} />
                <Field label="Cumpleanos" value={formatDate(profile?.fecha_nacimiento)} icon={<CalendarDays size={15} />} />
                <Field label="Nombre" value={valueOrFallback(profile?.nombre)} icon={<UserRound size={15} />} />
                <Field label="Apellido" value={valueOrFallback(profile?.apellido)} icon={<UserRound size={15} />} />
                <Field label="Genero" value={valueOrFallback(profile?.genero)} />
                <Field label="Telefono" value={valueOrFallback(profile?.telefono)} icon={<Phone size={15} />} />
            </div>
        </section>
    );
}

function BadgeList({ values }: { values?: string[] }) {
    if (!values || values.length === 0) {
        return <p className="text-sm text-slate-500">No informado</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {values.map((value) => (
                <span
                    key={value}
                    className="rounded-full border border-cef-primary/20 bg-cef-primary/10 px-3 py-1 text-xs font-semibold text-cef-primary"
                >
                    {value}
                </span>
            ))}
        </div>
    );
}

function MedicalRecordView({ record }: { record: MedicalRecordProfile | null }) {
    if (!record) {
        return (
            <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-500">Todavia no tenes una ficha medica cargada.</p>
            </div>
        );
    }

    const body = record.cuerpo_ficha || {};
    const emergency = body.contacto_emergencia;
    const background = body.antecedentes_medicos;
    const health = body.informacion_adicional_salud;
    const surgeries = body.historial_cirugias || [];
    const allergies = body.alergias_y_medicacion;
    const activity = body.actividad_fisica_y_objetivos;

    return (
        <div className="space-y-4">
            <SectionCard title="Contacto de emergencia" icon={<Ambulance size={18} />}>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Nombre" value={valueOrFallback(emergency?.nombre)} />
                    <Field label="Relacion" value={valueOrFallback(emergency?.relacion)} />
                    <Field label="Telefono" value={valueOrFallback(emergency?.telefono)} />
                </div>
            </SectionCard>

            <SectionCard title="Antecedentes medicos" icon={<HeartPulse size={18} />}>
                <div className="space-y-3">
                    <BadgeList values={background?.afecciones} />
                    {background?.especifique_otros ? (
                        <Field label="Otros" value={background.especifique_otros} />
                    ) : null}
                </div>
            </SectionCard>

            <SectionCard title="Informacion adicional de salud" icon={<Stethoscope size={18} />}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Fuma o ha fumado" value={valueOrFallback(health?.fuma_o_ha_fumado)} />
                    <Field label="Consume alcohol" value={valueOrFallback(health?.consume_alcohol)} />
                    <Field label="Sintomas recientes" value={valueOrFallback(health?.mareos_falta_aire_o_dolor_pecho)} />
                    <Field label="Horas de sueno" value={valueOrFallback(health?.horas_sueno_promedio)} />
                    <Field label="Dificultad para dormir" value={valueOrFallback(health?.dificultad_para_dormir)} />
                    <Field label="Nutricion" value={valueOrFallback(health?.dieta_especial_o_suplementacion)} />
                </div>
            </SectionCard>

            <SectionCard title="Historial de cirugias" icon={<ClipboardList size={18} />}>
                {surgeries.length > 0 ? (
                    <div className="space-y-3">
                        {surgeries.map((surgery, index) => (
                            <div key={`${surgery.descripcion}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-sm font-semibold text-slate-800">Cirugia {index + 1}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Descripcion" value={valueOrFallback(surgery.descripcion)} />
                                    <Field label="Fecha" value={surgery.fecha ? formatDate(surgery.fecha) : "No informado"} />
                                    <div className="sm:col-span-2">
                                        <Field label="Complicaciones/Secuelas" value={valueOrFallback(surgery.complicaciones_secuelas)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Sin cirugias informadas.</p>
                )}
            </SectionCard>

            <SectionCard title="Alergias y medicacion" icon={<Pill size={18} />}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Alergias" value={valueOrFallback(allergies?.alergias)} />
                    <Field label="Medicacion actual" value={valueOrFallback(allergies?.medicacion_actual)} />
                </div>
            </SectionCard>

            <SectionCard title="Actividad fisica y objetivos" icon={<Dumbbell size={18} />}>
                <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Actividad fisica actual" value={valueOrFallback(activity?.realiza_actividad_fisica_actualmente)} />
                        <Field label="Frecuencia" value={valueOrFallback(activity?.frecuencia)} />
                    </div>
                    <div className="glass rounded-xl p-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Objetivos</p>
                        <BadgeList values={activity?.objetivo_principal} />
                    </div>
                </div>
            </SectionCard>

        </div>
    );
}

function normalizeSection(section?: string): ProfileSection {
    if (section === "datos-personales" || section === "ficha-medica" || section === "cuenta") {
        return section;
    }

    return "cuenta";
}

type ProfilePageProps = {
    searchParams: Promise<{ seccion?: string; editar?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
    const { seccion } = await searchParams;
    const activeSection = normalizeSection(seccion);
    const [profile, medicalRecord] = await Promise.all([getProfile(), getMedicalRecord()]);

    const isEditing = typeof seccion === "string" && (await searchParams).editar;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Perfil</h1>
                <p className="mt-1 text-sm text-slate-400">Elegí que informacion queres consultar.</p>
            </div>

            <ProfileSectionSelector activeSection={activeSection} />

            {activeSection === "cuenta" ? <AccountSection profile={profile} /> : null}
            {activeSection === "datos-personales" ? (
                isEditing ? (
                    <PersonalDataEditForm profile={profile} />
                ) : (
                    <>
                        <div className="flex justify-end">
                            <Link href="/profile?seccion=datos-personales&editar=1" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                Editar
                            </Link>
                        </div>
                        <PersonalDataSection profile={profile} />
                    </>
                )
            ) : null}
            {activeSection === "ficha-medica" ? (
                isEditing ? (
                    <MedicalRecordEditForm record={medicalRecord} />
                ) : (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cef-primary text-white">
                                <HeartPulse size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Ficha medica</h2>
                                <p className="text-sm text-slate-400">Datos de salud</p>
                            </div>
                            <div className="ml-auto">
                                <Link href="/profile?seccion=ficha-medica&editar=1" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    Editar ficha medica
                                </Link>
                            </div>
                        </div>
                        <MedicalRecordView record={medicalRecord} />
                    </section>
                )
            ) : null}
        </div>
    );
}
