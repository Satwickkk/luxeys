import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-bronze-dark text-cornsilk pt-24 pb-12 px-6 md:px-10 mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div>
            <h4 className="font-serif text-3xl mb-6 tracking-tight">LYS.</h4>
            <p className="text-sm opacity-60 leading-relaxed uppercase tracking-wider">
              Curated aesthetics for the discerning soul.
            </p>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-[0.3em] mb-6 opacity-40">Explore</h5>
            <ul className="space-y-4 text-sm">
              <li><Link to="/shop" className="hover:opacity-60 transition-opacity">Collections</Link></li>
              <li><Link to="/shop" className="hover:opacity-60 transition-opacity">Editorial</Link></li>
              <li><Link to="/shop" className="hover:opacity-60 transition-opacity">Sustainable Living</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-[0.3em] mb-6 opacity-40">Support</h5>
            <ul className="space-y-4 text-sm">
              <li><span className="opacity-80">Shipping &amp; Returns</span></li>
              <li><span className="opacity-80">Care Guide</span></li>
              <li><span className="opacity-80">Contact</span></li>
            </ul>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-[0.3em] mb-6 opacity-40">Newsletter</h5>
            <div className="flex border-b border-cornsilk/30 pb-2">
              <input
                type="email"
                placeholder="Your email address"
                className="bg-transparent text-sm w-full outline-none placeholder:text-cornsilk/30"
              />
              <button className="text-xs uppercase tracking-widest ml-4">Join</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-cornsilk/10 opacity-40 text-[10px] uppercase tracking-widest">
          <p>© 2026 LYS Studio. All rights reserved.</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <span>Instagram</span>
            <span>Pinterest</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
