import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const HeaderLogo = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      className="ml-auto shrink-0"
      aria-label="Go to home"
    >
      <img src={logo} alt="Dare Me" className="h-8" />
    </button>
  );
};

export default HeaderLogo;
