export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'inactive' | 'banned';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
  avatar?: string;
  role?: 'admin' | 'moderator' | 'user';
  status?: 'active' | 'inactive' | 'banned';
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  created_at: Date;
}