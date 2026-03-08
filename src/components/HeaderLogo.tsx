import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const HeaderLogo = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
      aria-label="Go to home"
    >
      <img src={logo} alt="Dare Me" className="h-8" />
    </button>
  );
};

export default HeaderLogo;
