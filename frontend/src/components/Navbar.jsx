import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === "staff" || user?.role === "supervisor";

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand" aria-label="Refound home">
          <Logo />
          <span className="brand__name">
            Re<em>found</em>
          </span>
          <span className="brand__desk">Desk No. 04</span>
        </Link>

        <nav className="nav__links" aria-label="Main">
          <NavLink to="/items" className="nav__link">
            Register
          </NavLink>
          {user?.role === "student" && (
            <NavLink to="/claims" className="nav__link">
              My claims
            </NavLink>
          )}
          {isStaff && (
            <>
              <NavLink to="/staff" end className="nav__link">
                Desk
              </NavLink>
              <NavLink to="/staff/claims" className="nav__link">
                Claims
              </NavLink>
              {user.role === "supervisor" && (
                <NavLink to="/staff/logbook" className="nav__link">
                  Logbook
                </NavLink>
              )}
            </>
          )}
          {user ? (
            <>
              {!isStaff && (
                <NavLink to="/welcome" className="nav__link">
                  {user.name.split(" ")[0]}'s desk
                </NavLink>
              )}
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav__link">
                Log in
              </NavLink>
              <Link to="/signup" className="btn btn--ink btn--sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
