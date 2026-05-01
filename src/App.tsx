import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { ExamStartPage } from "@/pages/ExamStartPage";
import { ExamSessionPage } from "@/pages/ExamSessionPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicProofPage } from "@/pages/PublicProofPage";
import { VerifyPage } from "@/pages/VerifyPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/exam/start" element={<ExamStartPage />} />
        <Route path="/exam/session/:sessionId" element={<ExamSessionPage />} />
        <Route path="/exam" element={<Navigate to="/exam/start" replace />} />
        <Route path="/p/:proofId" element={<PublicProofPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
