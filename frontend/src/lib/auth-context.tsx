'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  AuthApi,
} from './endpoints';

import {
  getToken,
  setToken,
} from './api';

import type {
  User,
} from './types';


interface AuthContextValue {
  user:
    User | null;

  loading:
    boolean;

  login:
    (
      email: string,
      password: string,
    ) => Promise<void>;

  register:
    (
      data: {
        fullName:
          string;

        email:
          string;

        password:
          string;

        branchId:
          string;

        departmentId:
          string;

        phone?:
          string;
      },
    ) => Promise<void>;

  logout:
    () => Promise<void>;

  refreshUser:
    () => Promise<void>;
}


const AuthContext =
  createContext<
    AuthContextValue | null
  >(
    null,
  );


export function AuthProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const router =
    useRouter();


  /*
   * ==========================================================
   * LOAD CURRENT USER
   * ==========================================================
   */

  async function refreshUser() {
    if (
      !getToken()
    ) {
      setUser(
        null,
      );

      setLoading(
        false,
      );

      return;
    }


    try {
      const me =
        await AuthApi.me();


      setUser(
        me,
      );
    } catch {
      setToken(
        null,
      );

      setUser(
        null,
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(
    () => {
      void refreshUser();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );


  /*
   * ==========================================================
   * LOGIN
   * ==========================================================
   */

  async function login(
    email:
      string,

    password:
      string,
  ) {
    setLoading(
      true,
    );


    try {
      const result =
        await AuthApi.login(
          email,
          password,
        );


      setToken(
        result.accessToken,
      );


      /*
       * Immediately fetch the authoritative full User.
       *
       * This means Profile/Navbar never depend on a
       * shortened login response.
       */
      const me =
        await AuthApi.me();


      setUser(
        me,
      );
    } catch (
      error
    ) {
      setToken(
        null,
      );

      setUser(
        null,
      );

      throw error;
    } finally {
      setLoading(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * REGISTER
   * ==========================================================
   */

  async function register(
    data: {
      fullName:
        string;

      email:
        string;

      password:
        string;

      branchId:
        string;

      departmentId:
        string;

      phone?:
        string;
    },
  ) {
    setLoading(
      true,
    );


    try {
      const result =
        await AuthApi.register(
          data,
        );


      setToken(
        result.accessToken,
      );


      const me =
        await AuthApi.me();


      setUser(
        me,
      );
    } catch (
      error
    ) {
      setToken(
        null,
      );

      setUser(
        null,
      );

      throw error;
    } finally {
      setLoading(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * LOGOUT
   * ==========================================================
   */

  async function logout() {
    try {
      await AuthApi.logout();
    } catch {
      /*
       * Local logout must still succeed even when
       * the backend request fails.
       */
    }


    setToken(
      null,
    );

    setUser(
      null,
    );


    router.push(
      '/',
    );
  }


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );


  if (
    !context
  ) {
    throw new Error(
      'useAuth must be used within AuthProvider',
    );
  }


  return context;
}