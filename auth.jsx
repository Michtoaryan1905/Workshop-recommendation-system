import React, { createContext, useContext, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('wrs_user') || 'null'));
  const save = ({ token, user }) => { localStorage.setItem('wrs_token', token); localStorage.setItem('wrs_user', JSON.stringify(user)); setUser(user); return user; };
  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data);
  const register = async (body) => save((await api.post('/auth/register', body)).data);
  const logout = () => { localStorage.removeItem('wrs_token'); localStorage.removeItem('wrs_user'); setUser(null); };
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
