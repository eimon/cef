export enum UserRole {
    ADMIN = "admin",
    RECEPTION = "reception",
    CLIENT = "client",
}

export interface User {
    id: string; // uuid
    username: string;
    email: string;
    phone: string;
    full_name: string;
    role: string | UserRole;
    is_active: boolean;
    created_at: string; // datetime
}
export interface AuthResponse {
    access_token: string;
    token_type: string;
}