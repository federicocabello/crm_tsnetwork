import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";

import Login from "./components/Login";
import Inicio from "./pages/Inicio";
import Configuracion from "./pages/Configuracion";
import NuevoRegistro from "./pages/NuevoRegistro";
import Inventario from "./pages/Inventario";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleRoute from "./auth/RoleRoute";
import Layout from "./components/Layout";
import Cliente from "./pages/Cliente";
import Pagos from "./pages/Pagos";

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
              <RoleRoute allow={["administrador", "superadmin"]}>
                <Layout>
                  <Configuracion />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/nuevo-registro"
            element={
              <RoleRoute allow={["administrador", "superadmin", "moderador", "usuario"]}>
                <Layout>
                  <NuevoRegistro />
                </Layout>
              </RoleRoute>
            }
          />

          <Route
            path="/inventario"
            element={
              <RoleRoute allow={["administrador", "superadmin"]}>
                <Layout>
                  <Inventario />
                </Layout>
              </RoleRoute>
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

          <Route
            path="/pagos"
            element={
              <RoleRoute allow={["administrador", "superadmin", "moderador", "usuario"]}>
                <Layout>
                  <Pagos />
                </Layout>
              </RoleRoute>
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
