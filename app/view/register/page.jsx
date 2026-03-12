// app/register/page.jsx
"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Image from "next/image";

import WelcomeIcon from "../../components/WelcomeIcon";
import RegisterHeader from "../../components/RegisterHeader";
import RegisterForm from "../../components/RegisterForm";
import { handleFormSubmit } from "../../utils/formHandlers";
import { handleSubmitRegister } from "../../controller/registerController";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e) => {
    handleFormSubmit({
      e,
      controllerFn: handleSubmitRegister,
      data: { name, email, role, reason },
      setLoading,
      onSuccess: (response) => {
        alert(response.message || "Access request submitted successfully! Your request will be reviewed by an admin.");
        window.location.href = "/";
      },
      onError: (error) => alert(error.message),
    });
  };

  return (
    <div className="flex h-screen font-inter overflow-hidden">
      <WelcomeIcon />

      {/* 📱 MOBILE DARK | 💻 DESKTOP WHITE */}
      <div className="w-full md:w-1/2 bg-[#0B0B0B] md:bg-white flex flex-col items-center justify-center p-8 overflow-y-auto transition-colors duration-300">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden text-center mb-4">
            <div className="mb-2 w-full max-w-md drop-shadow-2xl mt-10 hover:scale-105 transition-transform duration-300 ease-in-out animate__animated animate__fadeInDown animate__slow">
              <Image
                src="/logo.png"
                alt="Company Logo"
                width={400}
                height={400}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Header */}
          <div className="animate__animated animate__fadeInDown animate__slow mb-2">
            <RegisterHeader />
          </div>

          {/* Form */}
          <div className="animate__animated animate__fadeInUp animate__slow mb-4">
            <RegisterForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              role={role}
              setRole={setRole}
              reason={reason}
              setReason={setReason}
              onSubmit={onSubmit}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
