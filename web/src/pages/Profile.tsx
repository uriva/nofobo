import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
      <div className="text-center">
        <p className="text-grape-300 mb-4">
          Edit your profile in onboarding
        </p>
        <button
          onClick={() => navigate("/onboarding")}
          className="bg-grape-600 hover:bg-grape-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Go to Onboarding
        </button>
      </div>
    </div>
  );
}
