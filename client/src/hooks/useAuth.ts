import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  setCredentials, logout as logoutAction,
  selectCurrentUser, selectToken, selectIsAuth, selectUserRole,
  type AuthUser, type UserRole,
} from '../store/authSlice';
import { getStoredSession, storeSession, clearSession } from '../store/apiSlice';
import {
  useUserLoginMutation, useUserLogoutMutation, useUserRegisterMutation,
  useOrganizerLoginMutation, useOrganizerLogoutMutation, useOrganizerRegisterMutation,
  useAdminLoginMutation, useAdminLogoutMutation,
  useInfluencerLoginMutation, useInfluencerLogoutMutation, useInfluencerRegisterMutation,
} from '../store/api';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user     = useAppSelector(selectCurrentUser);
  const token    = useAppSelector(selectToken);
  const isAuth   = useAppSelector(selectIsAuth);
  const role     = useAppSelector(selectUserRole);

  // ── Restore session from localStorage on mount ────────────────────────────
  useEffect(() => {
    if (isAuth) return;
    const session = getStoredSession();
    if (session?.token) {
      // Determine role from stored session data
      const roles: UserRole[] = ['customer', 'organizer', 'admin', 'super_admin', 'influencer'];
      for (const r of roles) {
        try {
          const s = JSON.parse(localStorage.getItem(`buizz-${r === 'super_admin' ? 'super-admin' : r}-session`) || '{}');
          if (s?.token === session.token) {
            const entity = s[r] || s.user || s.admin || s.organizer || s.influencer;
            if (entity) {
              dispatch(setCredentials({
                user: { ...entity, role: r } as AuthUser,
                token: s.token,
                refreshToken: s.refreshToken,
              }));
              break;
            }
          }
        } catch {}
      }
    }
  }, [dispatch, isAuth]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [userLogin]         = useUserLoginMutation();
  const [userLogout]        = useUserLogoutMutation();
  const [userRegister]      = useUserRegisterMutation();
  const [orgLogin]          = useOrganizerLoginMutation();
  const [orgLogout]         = useOrganizerLogoutMutation();
  const [orgRegister]       = useOrganizerRegisterMutation();
  const [adminLogin]        = useAdminLoginMutation();
  const [adminLogout]       = useAdminLogoutMutation();
  const [influencerLogin]   = useInfluencerLoginMutation();
  const [influencerLogout]  = useInfluencerLogoutMutation();
  const [influencerRegister]= useInfluencerRegisterMutation();

  // ── Login dispatcher ──────────────────────────────────────────────────────
  const login = useCallback(async (
    credentials: { email: string; password: string },
    asRole: UserRole = 'customer'
  ) => {
    let result: any;

    if (asRole === 'organizer') result = await orgLogin(credentials).unwrap();
    else if (asRole === 'admin') result = await adminLogin(credentials).unwrap();
    else if (asRole === 'influencer') result = await influencerLogin(credentials).unwrap();
    else result = await userLogin(credentials).unwrap();

    const entity = result.data?.user || result.data?.organizer || result.data?.admin || result.data?.influencer;
    if (entity && result.data?.token) {
      dispatch(setCredentials({
        user: { ...entity, role: asRole } as AuthUser,
        token: result.data.token,
        refreshToken: result.data.refreshToken,
      }));
      storeSession(asRole, { token: result.data.token, refreshToken: result.data.refreshToken, [asRole]: entity });
    }
    return result;
  }, [dispatch, userLogin, orgLogin, adminLogin, influencerLogin]);

  // ── Register dispatcher ───────────────────────────────────────────────────
  const register = useCallback(async (data: any, asRole: UserRole = 'customer') => {
    let result: any;

    if (asRole === 'organizer') result = await orgRegister(data).unwrap();
    else if (asRole === 'influencer') result = await influencerRegister(data).unwrap();
    else result = await userRegister(data).unwrap();

    const entity = result.data?.user || result.data?.organizer || result.data?.influencer;
    if (entity && result.data?.token) {
      dispatch(setCredentials({
        user: { ...entity, role: asRole } as AuthUser,
        token: result.data.token,
        refreshToken: result.data.refreshToken,
      }));
      storeSession(asRole, { token: result.data.token, refreshToken: result.data.refreshToken, [asRole]: entity });
    }
    return result;
  }, [dispatch, userRegister, orgRegister, influencerRegister]);

  // ── Logout dispatcher ─────────────────────────────────────────────────────
  const logoutUser = useCallback(async () => {
    try {
      if (role === 'organizer') await orgLogout().unwrap();
      else if (role === 'admin') await adminLogout().unwrap();
      else if (role === 'influencer') await influencerLogout().unwrap();
      else await userLogout().unwrap();
    } catch {}
    clearSession(role);
    dispatch(logoutAction());
  }, [dispatch, role, userLogout, orgLogout, adminLogout, influencerLogout]);

  return {
    user,
    token,
    isAuthenticated: isAuth,
    role,
    isUser:       role === 'customer',
    isOrganizer:  role === 'organizer',
    isAdmin:      role === 'admin',
    isInfluencer: role === 'influencer',
    login,
    register,
    logout: logoutUser,
  };
};
