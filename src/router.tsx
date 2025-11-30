import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "./ui/AppShell";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SurveyDepartment from "./pages/survey/Department";
import SurveyLabel from "./pages/survey/Label";
import SurveyAsset from "./pages/survey/Asset";
import SurveyProduct from "./pages/survey/Product";
import SurveyAll from "./pages/survey/SurveyAll";
import SurveyHistory from "./pages/survey/History";
import MockHost from "./pages/mock/MockHost";

const routes = [
  {
    path: "/",
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "mock/login", element: <MockHost mode="login" /> },
      { path: "mock/dashboard", element: <MockHost mode="dashboard" /> },
      { path: "mock/assets", element: <MockHost mode="assets" /> },
      { path: "login", element: <Login /> },
      {
        element: <AppShell />,
        children: [
          { path: "home", element: <Navigate to="/survey/home" replace /> },
          { path: "survey/home", element: <Home /> },
          { path: "survey/all", element: <SurveyAll /> },
          { path: "survey/department", element: <SurveyDepartment /> },
          { path: "survey/label", element: <SurveyLabel /> },
          { path: "survey/asset", element: <SurveyAsset /> },
          { path: "survey/product", element: <SurveyProduct /> },
          { path: "survey/history", element: <SurveyHistory /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  // Vite の base (`/poc-survey-offline-mock/`) に追従
  basename: import.meta.env.BASE_URL,
});
