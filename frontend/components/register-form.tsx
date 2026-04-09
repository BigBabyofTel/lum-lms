import React, {useActionState, useState} from "react";
import {FormState} from "@/lib/types";
import {handleRegister} from "@/lib/actions";

interface RegisterFormProps {
    role: string
}


export default function RegisterForm(props: RegisterFormProps) {
    const [email, setEmail] = useState<string>('')
    const [firstName, setFirstName] = useState<string>('')
    const [lastName, setLastName] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [confirmPassword, setConfirmPassword] = useState<string>('')

    const [state, formAction, isPending] = useActionState<
        FormState | null,
        FormData
    >(handleRegister, null);



    return (
        <form
            action={formAction}
            className="w-screen space-y-4 p-2 flex flex-col items-center justify-center"
        >
            <div className="p-2 w-full">
                <input
                    name="email"
                    placeholder="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
                />
            </div>
            <div className="p-2 w-full">
                <input
                    name="first_name"
                    placeholder="first_name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
                />
            </div>
            <div className="p-2 w-full">
                <input
                    name="last_name"
                    placeholder="last_name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
                />
            </div>
            <div className="p-2 w-full">
                <input
                    name="password"
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
                />
            </div>
            <div className="p-2 w-full">
                <input
                    name="confirmPassword"
                    placeholder="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="space-y-1 p-2 bg-white/20 backdrop-blur-md border border-white/30 w-full"
                />
            </div>
            <div>
                {/*
                add a radio option here
                */}
                <input
                    name="role"
                    id="role"
                    type="hidden"
                    value={props.role}
                />
            </div>
            {state?.error && <p className="text-red-500">{state.error}</p>}
            {state?.success && <p className="text-green-500">{state.success}</p>}
            <button
                disabled={isPending}
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
                Register
            </button>
        </form>
    )
}