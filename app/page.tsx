import Link from "next/link";
import { Plane, CheckCircle, ArrowRight, Globe, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="py-6 px-4 md:px-8 flex items-center justify-between backdrop-blur-lg bg-black/20 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">TravelPro</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link href="/status-check">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Check Status
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Streamlined Travel <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Management Solutions</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            The complete platform for travel agencies to manage clients, visas and applications with ease
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signin">
              <Button className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-xl transition-all duration-300">
                Sign In To Dashboard
              </Button>
            </Link>
            <Link href="/status-check">
              <Button variant="outline" className="h-14 px-8 border-white/20 bg-black/10 text-white hover:bg-white/10 font-semibold text-lg">
                <CheckCircle className="mr-2 h-5 w-5" /> Check Application Status
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 md:px-8 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Comprehensive Travel Agency Management
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="bg-blue-500/20 p-3 rounded-lg inline-block mb-4">
                <Globe className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Global Visa Management</h3>
              <p className="text-gray-300">
                Track and manage visa applications for clients around the world with real-time status updates.
              </p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="bg-purple-500/20 p-3 rounded-lg inline-block mb-4">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Client Relationship</h3>
              <p className="text-gray-300">
                Organize client information, applications, and communication in one centralized system.
              </p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="bg-cyan-500/20 p-3 rounded-lg inline-block mb-4">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Secure Client Portal</h3>
              <p className="text-gray-300">
                Allow clients to check their application status and documents securely online.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to transform your travel agency business?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of agencies using TravelPro to grow their business and deliver exceptional service
          </p>
          
          <Link href="/auth/signin">
            <Button className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-xl transition-all duration-300">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 bg-black/30 backdrop-blur-md border-t border-white/10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 rounded">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-gray-400">TravelPro © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Privacy Policy</Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Terms of Service</Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Contact Us</Button>
            <Link href="/status-check">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">Check Status</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
