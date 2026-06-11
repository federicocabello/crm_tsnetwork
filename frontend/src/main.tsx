import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";

import Login from "./components/Login";
import Inicio from "./pages/Inicio";
import Configuracion from "./pages/Configuracion";
import NuevoRegistro from "./pages/NuevoRegistro";

import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Cliente from "./pages/Cliente";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />

          <Route
            path="/inicio"
            element={
              <ProtectedRoute>
                <Layout>
                  <Inicio />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracion"
            element={
              <ProtectedRoute>
                <Layout>
                  <Configuracion />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/nuevo-registro"
            element={
              <ProtectedRoute>
                <Layout>
                  <NuevoRegistro />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clientes/:idCliente"
            element={
              <ProtectedRoute>
                <Layout>
                  <Cliente />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
