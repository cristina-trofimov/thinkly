import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "@/api/AuthAPI";
import type { Account } from "@/types/account/Account.type";

interface UserContextType {
    user: Account | null;
    loading: boolean;
    setUser: React.Dispatch<React.SetStateAction<Account | null>>;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const profile = await getProfile();
            setUser(profile);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, setUser, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};