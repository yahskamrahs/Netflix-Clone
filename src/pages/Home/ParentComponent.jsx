import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BiUpArrowAlt, BiHomeAlt, BiMoviePlay, BiTv, BiSearch, BiBookmark } from 'react-icons/bi';
import { FaUserCircle, FaSignOutAlt, FaGooglePlay, FaApple } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { buildBrowsePath, getCategoryBySlug } from './urlFilters';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import AuthModal from "../../components/AuthModal";

function ParentComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOpenAuthModal = () => setIsAuthModalOpen(true);
    window.addEventListener('openAuthModal', handleOpenAuthModal);
    return () => window.removeEventListener('openAuthModal', handleOpenAuthModal);
  }, []);

  useEffect(() => {
    const allowedLinks = (import.meta.env.VITE_ALLOWED_LINKS || '').split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
    
    const handleClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href) return;

      if (!href.startsWith('http')) return;

      const isAllowed = allowedLinks.some(link => href.toLowerCase().startsWith(link));
      
      if (!isAllowed) {
        e.preventDefault();
        console.warn(`Blocked redirection to: ${href}. Not in VITE_ALLOWED_LINKS.`);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const activePage =
    location.pathname === '/'                  ? 'home'
    : location.pathname.startsWith('/movies')  ? 'movies'
    : location.pathname.startsWith('/series')  ? 'series'
    : location.pathname.startsWith('/search')  ? 'search'
    : location.pathname.startsWith('/watchlist') ? 'watchlist'
    : location.pathname.startsWith('/movie/')  ? 'movies'
    : location.pathname.startsWith('/tv/')     ? 'series'
    : 'home';

  const handleScroll = useCallback(() => {
    setScrollPosition(window.scrollY);
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Hide bottom nav when the virtual keyboard is open (mobile)
  useEffect(() => {
    let timeoutId;
    const handleFocus = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        setKeyboardOpen(true);
      }
    };
    const handleBlur = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        // Delay closing slightly to prevent flicker if jumping between inputs
        timeoutId = setTimeout(() => {
          // Double check if focus moved to another input
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag !== 'input' && activeTag !== 'textarea') {
            setKeyboardOpen(false);
          }
        }, 150);
      }
    };

    // Use capture phase for focus/blur as they are much more reliable than focusin/focusout bubbling on iOS PWAs
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    const vv = window.visualViewport;
    const handleResize = () => {
      if (vv && vv.height < window.innerHeight * 0.85) {
        setKeyboardOpen(true);
      }
    };
    if (vv) vv.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      if (vv) vv.removeEventListener('resize', handleResize);
    };
  }, []);

  const selectedGenreId = (() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'movies' && pathParts[1]) {
      return getCategoryBySlug('movie', pathParts[1])?.id ?? null;
    }
    if (pathParts[0] === 'series' && pathParts[1]) {
      return getCategoryBySlug('tv', pathParts[1])?.id ?? null;
    }
    return searchParams.get('genre') ? Number(searchParams.get('genre')) : null;
  })();

  const handleNavigation = (page) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (page === 'home')        navigate('/');
    else if (page === 'movies') navigate('/movies');
    else if (page === 'series') navigate('/series');
    else                        navigate(`/${page}`);
  };

  const handleGenreSelect = (genreId) => {
    const type = activePage === 'series' ? 'tv' : 'movie';
    window.scrollTo({ top: 0, behavior: 'auto' });
    navigate(buildBrowsePath(type, genreId, 'popularity.desc'));
  };

  return (
    <div className="min-h-screen relative text-white">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigation}
        selectedGenreId={selectedGenreId}
        onGenreSelect={handleGenreSelect}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Global Top-Right Search (Desktop) */}
      {location.pathname !== '/search' && (
        <div className="hidden md:flex fixed top-6 right-8 z-50">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const q = e.target.search.value.trim();
              if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
            className="relative group flex items-center"
          >
            <BiSearch className="absolute left-4 text-gray-400 text-lg group-focus-within:text-red-400 transition-colors pointer-events-none z-10" />
            <input
              type="text"
              name="search"
              placeholder="Search movies, TV shows..."
              autoComplete="off"
              className="w-64 bg-[#111319]/80 backdrop-blur-2xl border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-[#111319]/95 focus:w-80 transition-all duration-300 shadow-2xl"
            />
          </form>
        </div>
      )}

      {scrollPosition > 300 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 right-4 z-50 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 shadow-lg hover:scale-110 transition-all duration-300"
          aria-label="Scroll to Top"
        >
          <BiUpArrowAlt className="text-2xl" />
        </button>
      )}

      {/* Page content */}
      <div className="md:pl-[84px] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />

        {/* Footer — home page only */}
        {location.pathname === '/' && <footer className="bg-[#0a0c12] pt-8 mt-12 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6 pb-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-2xl tracking-tight">Net<span className="text-red-500">Stream</span></span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm text-center md:text-left">
                Your ultimate destination for movies and TV shows. Download our official app for the best mobile experience.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href={import.meta.env.VITE_PLAYSTORE_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black/50 hover:bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 transition-all shadow-lg hover:shadow-xl hover:border-white/20"
              >
                <FaGooglePlay className="text-2xl text-emerald-400" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none">GET IT ON</span>
                  <span className="text-sm text-white font-semibold leading-tight mt-0.5">Google Play</span>
                </div>
              </a>
              <a 
                href={import.meta.env.VITE_APPSTORE_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black/50 hover:bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 transition-all shadow-lg hover:shadow-xl hover:border-white/20"
              >
                <FaApple className="text-3xl text-white -mt-1" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none">Download on the</span>
                  <span className="text-sm text-white font-semibold leading-tight mt-0.5">App Store</span>
                </div>
              </a>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span>Developed and Designed By <a href="https://akshaykumarsharma.in" target="_blank" rel="noopener noreferrer" className="text-gray-300 font-medium hover:text-white transition-colors">Akshaykumar Sharma</a></span>
            </div>
            <div className="flex items-center gap-3">
              <span>© {new Date().getFullYear()} Netflix Clone</span>
              <span>·</span>
              <span>
                Data by{' '}
                <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
                  TMDB
                </a>
              </span>
            </div>
          </div>
        </footer>}
      </div>

      {/* Mobile bottom navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b14] border-t border-white/[0.08] shadow-[0_-10px_30px_rgba(0,0,0,0.55)] items-center justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] ${keyboardOpen ? 'hidden' : 'flex'}`}>
        {[
          { id: 'home',   icon: BiHomeAlt,   label: 'Home'    },
          { id: 'movies', icon: BiMoviePlay, label: 'Movies'  },
          { id: 'series', icon: BiTv,        label: 'TV'      },
          { id: 'search', icon: BiSearch,    label: 'Search'  },
          { id: 'watchlist', icon: BiBookmark, label: 'Watchlist' },
        ].map(({ id, icon: Icon, label }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => handleNavigation(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="text-2xl" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
        {/* Mobile Profile/Auth Button */}
        {user ? (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-red-500/80 hover:text-red-400"
          >
            <FaSignOutAlt className="text-2xl" />
            <span className="text-[10px] font-medium font-bold uppercase tracking-wider">Log Out</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-gray-500 hover:text-gray-300"
          >
            <FaUserCircle className="text-2xl" />
            <span className="text-[10px] font-medium">Log In</span>
          </button>
        )}
      </nav>

      {/* Auth Modal Form */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default ParentComponent;
