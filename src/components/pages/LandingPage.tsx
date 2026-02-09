'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { checkAuthAndRedirect } from '@/lib/clientAuth';
import {
  Milk,
  Shield,
  Users,
  BarChart3,
  Clock,
  Award,
  ArrowRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Linkedin,
  Youtube,
  Star,
  CheckCircle,
  TrendingUp,
  Beaker,
  Gauge,
  Target,
  Globe,
  Zap,
  Smartphone,
  Wifi,
  Database,
  FileText,
  CreditCard,
  Layers,
  Monitor,
  Cloud,
  Lock,
  Bell,
  PieChart,
  ArrowDown,
  Play,
  ChevronRight,
  ChevronDown,
  Radio,
  Cpu,
  Activity,
  Languages,
  Building2,
  Factory,
  Wheat,
  Droplets,
  Settings,
  Download,
  Send,
  Eye,
  Bluetooth,
  Cable,
  CircleDot,
  Workflow,
  IndianRupee,
  Calculator,
  Printer,
  LineChart,
  AreaChart,
  BarChart2,
  Timer,
  ScanLine,
  Thermometer,
  Boxes,
  Table2,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

// ─── Animated Counter Component ────────────────────────────────────
function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Section Heading Component ─────────────────────────────────────
function SectionHeading({ badge, title, description, light = false }: { badge?: string; title: string; description?: string; light?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      viewport={{ once: true }}
      className="text-center mb-8 sm:mb-12 lg:mb-16 max-w-3xl mx-auto px-2"
    >
      {badge && (
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 ${light ? 'bg-white/10 text-white/90' : 'bg-emerald-100 text-emerald-700'}`}>
          {badge}
        </span>
      )}
      <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>
      {description && (
        <p className={`text-sm sm:text-base lg:text-lg ${light ? 'text-white/70' : 'text-gray-600'}`}>
          {description}
        </p>
      )}
    </motion.div>
  );
}

// ─── Feature Card Component ────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, delay = 0, gradient }: { icon: React.ElementType; title: string; description: string; delay?: number; gradient?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${gradient || 'bg-gradient-to-br from-emerald-500 to-green-600'}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── Workflow Step Component ───────────────────────────────────────
function WorkflowStep({ step, title, description, icon: Icon, delay }: { step: string; title: string; description: string; icon: React.ElementType; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      className="relative flex flex-col items-center text-center"
    >
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
          <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
        </div>
        <span className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-sm font-bold text-emerald-600">
          {step}
        </span>
      </div>
      <h4 className="text-lg font-bold text-gray-900 mt-5 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm max-w-xs">{description}</p>
    </motion.div>
  );
}

// ─── Dashboard Mockup SVG ──────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="bg-gray-900 rounded-t-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center">
          <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-300 inline-block">cloud.poornasree.com</div>
        </div>
      </div>
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-2.5 sm:p-4 overflow-hidden shadow-2xl">
        {/* Sidebar + Content Area */}
        <div className="flex gap-4">
          {/* Sidebar */}
          <div className="hidden sm:block w-44 border-r border-gray-100 pr-3 space-y-2">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-xs font-medium">
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard
            </div>
            {[{ icon: Factory, label: 'Dairies' }, { icon: Building2, label: 'BMC' }, { icon: Users, label: 'Societies' }, { icon: Wheat, label: 'Farmers' }, { icon: Monitor, label: 'Machines' }, { icon: FileText, label: 'Reports' }, { icon: PieChart, label: 'Analytics' }].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-500 rounded-lg px-3 py-2 text-xs">
                <item.icon className="w-3.5 h-3.5" /> {item.label}
              </div>
            ))}
          </div>
          {/* Main Content */}
          <div className="flex-1 space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Collections', value: '12,847', change: '+12%', color: 'emerald' },
                { label: 'Quantity (L)', value: '48,320', change: '+8%', color: 'blue' },
                { label: 'Avg Fat%', value: '4.52', change: '+0.3', color: 'purple' },
                { label: 'Revenue', value: '₹2.4L', change: '+15%', color: 'amber' }
              ].map((stat, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="text-[10px] text-gray-500">{stat.label}</div>
                  <div className="text-sm font-bold text-gray-900">{stat.value}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">{stat.change}</div>
                </div>
              ))}
            </div>
            {/* Chart Area */}
            <div className="rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Collection Trends</div>
              <div className="flex items-end gap-1 h-20">
                {[40, 55, 35, 65, 75, 60, 80, 70, 90, 55, 85, 95, 78, 68, 88, 72, 92, 65, 82, 75].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-green-400 rounded-t-sm"
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                    viewport={{ once: true }}
                  />
                ))}
              </div>
            </div>
            {/* Table */}
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 text-[10px] font-medium text-gray-500 grid grid-cols-5 gap-2">
                <span>Farmer</span><span>Qty (L)</span><span>Fat%</span><span>SNF%</span><span>Amount</span>
              </div>
              {[
                ['Rajan K.', '12.5', '5.2', '8.9', '₹475'],
                ['Suresh M.', '8.3', '4.8', '9.1', '₹316'],
                ['Anil P.', '15.2', '5.5', '8.7', '₹580'],
              ].map((row, i) => (
                <div key={i} className={`px-3 py-1.5 text-[10px] text-gray-700 grid grid-cols-5 gap-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  {row.map((cell, j) => <span key={j}>{cell}</span>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phone Mockup ──────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative w-52 sm:w-64 mx-auto">
      <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl shadow-gray-900/30">
        <div className="bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-700">
          {/* Notch */}
          <div className="bg-gray-900 flex justify-center pt-2 pb-1">
            <div className="w-24 h-5 bg-gray-800 rounded-full" />
          </div>
          {/* Screen */}
          <div className="bg-white mx-0.5 mb-0.5 rounded-b-[1.5rem] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3">
              <div className="text-white font-bold text-sm">PSR Cloud</div>
              <div className="text-emerald-100 text-[10px]">Farmer Dashboard</div>
            </div>
            {/* Content */}
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Today', v: '12.5 L' },
                  { l: 'Fat%', v: '5.2' },
                  { l: 'SNF%', v: '8.9' },
                  { l: 'Amount', v: '₹475' }
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-[9px] text-gray-500">{s.l}</div>
                    <div className="text-xs font-bold text-gray-900">{s.v}</div>
                  </div>
                ))}
              </div>
              {/* Mini Chart */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-[9px] text-gray-500 mb-1">Weekly Trend</div>
                <div className="flex items-end gap-0.5 h-10">
                  {[30, 50, 40, 70, 60, 80, 65].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-green-400 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                {['View Collections', 'Rate Chart', 'Payment History'].map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-gray-700">{item}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Machine Control Mockup ────────────────────────────────────────
function MachineControlMockup() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-3 sm:p-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-900">Live Analysis</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Lactosure Eco</span>
      </div>
      <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {[
          { label: 'FAT', value: '5.21', unit: '%', color: 'text-emerald-600' },
          { label: 'SNF', value: '8.58', unit: '%', color: 'text-blue-600' },
          { label: 'CLR', value: '28.10', unit: '', color: 'text-purple-600' },
          { label: 'TEMP', value: '32.5', unit: '°C', color: 'text-amber-600' }
        ].map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-medium">{m.label}</div>
            <div className={`text-base sm:text-lg font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[8px] sm:text-[9px] text-gray-400">{m.unit}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        {[
          { label: 'Protein', value: '3.42', color: 'text-pink-600' },
          { label: 'Lactose', value: '4.65', color: 'text-cyan-600' },
          { label: 'Salt', value: '0.02', color: 'text-red-500' },
          { label: 'Water', value: '0.0', color: 'text-teal-600' }
        ].map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-medium">{m.label}</div>
            <div className={`text-xs sm:text-sm font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
        <div>
          <div className="text-[10px] text-gray-500">Farmer: Rajan K.</div>
          <div className="text-xs font-bold text-gray-900">12.5 L → ₹475.00</div>
        </div>
        <CheckCircle className="w-5 h-5 text-emerald-600" />
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    checkAuthAndRedirect(router).catch(console.error);
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const sections = ['home', 'about', 'platform', 'features', 'how-it-works', 'hardware', 'mobile', 'testimonials', 'contact'];
      const pos = window.scrollY + 120;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el && pos >= el.offsetTop && pos < el.offsetTop + el.offsetHeight) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'platform', label: 'Platform' },
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'testimonials', label: 'Reviews' },
    { id: 'contact', label: 'Contact' },
  ];

  const platformFeatures = [
    { icon: Factory, title: 'Dairy Management', description: 'Manage multiple dairy facilities with capacity tracking, performance monitoring, and monthly targets.' , gradient: 'bg-gradient-to-br from-blue-500 to-blue-700' },
    { icon: Building2, title: 'BMC Operations', description: 'Oversee Bulk Milk Cooling Centers with society assignments, capacity management, and quality metrics.', gradient: 'bg-gradient-to-br from-purple-500 to-purple-700' },
    { icon: Users, title: 'Society Network', description: 'Coordinate farmer societies with real-time collection status, pulse monitoring, and performance analytics.', gradient: 'bg-gradient-to-br from-emerald-500 to-green-700' },
    { icon: Wheat, title: 'Farmer Registry', description: 'Complete farmer profiles with auto-generated UIDs, RFID, bank details, payment info, and performance tracking.', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { icon: Monitor, title: 'Machine Control', description: 'Real-time machine monitoring with BLE connectivity, live milk analysis data, and remote management.', gradient: 'bg-gradient-to-br from-rose-500 to-red-600' },
    { icon: Calculator, title: 'Rate Charts', description: 'Flexible rate chart management with CSV upload, multi-channel pricing (Cow/Buffalo/Mixed), and auto-sync to machines.', gradient: 'bg-gradient-to-br from-cyan-500 to-teal-600' },
    { icon: FileText, title: 'Smart Reports', description: 'Collection, Dispatch & Sales reports with PDF/CSV export, email delivery, and 6 comparison modes.', gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
    { icon: PieChart, title: 'Deep Analytics', description: 'Multi-dimensional breakdowns by dairy, BMC, society, machine, shift, and milk channel with interactive charts.', gradient: 'bg-gradient-to-br from-fuchsia-500 to-pink-600' },
    { icon: IndianRupee, title: 'Payment Processing', description: 'Automatic farmer payments via Paytm, UPI, Bank Transfer, or Cash with configurable payment cycles.', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700' },
    { icon: Bell, title: 'Notifications', description: 'Multi-channel alerts via Email, SMS (Twilio/MSG91), WhatsApp, and push notifications for every key event.', gradient: 'bg-gradient-to-br from-yellow-500 to-amber-600' },
    { icon: Languages, title: 'Multi-Language', description: 'Full interface support for English, Hindi (हिन्दी), and Malayalam (മലയാളം) — switch anytime.', gradient: 'bg-gradient-to-br from-sky-500 to-blue-600' },
    { icon: Activity, title: 'Live Monitoring', description: 'Real-time API monitoring, Section Pulse indicators, and system health dashboards for super admins.', gradient: 'bg-gradient-to-br from-red-500 to-rose-700' },
  ];

  const faqs = [
    { q: 'What is Poornasree Cloud?', a: 'Poornasree Cloud is a comprehensive dairy management platform that connects your Lactosure milk analyzers to the cloud, enabling real-time data collection, analytics, payment processing, and complete operational management for your dairy business.' },
    { q: 'Which machines are supported?', a: 'The platform supports Lactosure, Ekomilk, Ultrasonic, and Master milk analyzer models. Machines connect via our Poornasree HUB dongle using Bluetooth Low Energy (BLE) or USB serial connection.' },
    { q: 'How many languages are supported?', a: 'The platform fully supports English, Hindi (हिन्दी), and Malayalam (മലയാളം). You can switch languages anytime from the settings panel.' },
    { q: 'Is there a mobile app?', a: 'Yes! Poornasree Connect is our Flutter-based mobile app available on Android. Farmers, society coordinators, and admins can all access their dashboards on the go.' },
    { q: 'How is data security handled?', a: 'Each organization gets an isolated database schema with SSL-encrypted Azure MySQL. Authentication uses JWT tokens with role-based access control across 6 user levels. Admin registration requires OTP verification and super admin approval.' },
    { q: 'Can I export reports?', a: 'Absolutely. Reports can be exported as PDF or CSV, emailed directly, and support 6 different comparison modes including Collection vs Dispatch, BMC vs Society, and more.' },
  ];

  const testimonials = [
    { name: 'Kerala Dairy Cooperative', location: 'Ernakulam, Kerala', feedback: 'Poornasree Cloud has completely transformed how we manage our 200+ farmer network. Real-time milk analysis data and automated payments have saved us hours every day.', role: 'Dairy Administrator', rating: 5 },
    { name: 'Modern Milk Solutions', location: 'Coimbatore, Tamil Nadu', feedback: 'The machine control panel gives us instant visibility into milk quality at every collection point. The analytics have helped us improve our average Fat% by 0.3% in just 3 months.', role: 'BMC Operations Manager', rating: 5 },
    { name: 'Regional Milk Union', location: 'Bangalore, Karnataka', feedback: 'Multi-language support in Malayalam and Hindi means all our society coordinators can use the platform comfortably. The Section Pulse feature is brilliant for monitoring activity.', role: 'Society Coordinator', rating: 5 },
    { name: 'Anand Dairy Network', location: 'Gujarat', feedback: 'Switching from paper-based records to Poornasree Cloud was the best decision we made. CSV imports, automated rate charts, and payment tracking have eliminated manual errors completely.', role: 'Admin', rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ═══════════════════ NAVIGATION ═══════════════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-black/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="cursor-pointer" onClick={() => scrollTo('home')}>
              <div className="h-12 sm:h-14 lg:h-16 flex items-center">
                <Image src="/fulllogo.png" alt="Poornasree" width={120} height={48} className="object-contain h-full w-auto" />
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? isScrolled ? 'text-emerald-700 bg-emerald-50' : 'text-white bg-white/20'
                      : isScrolled ? 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50' : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push('/login')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${isScrolled ? 'text-gray-700 hover:text-emerald-600' : 'text-white/90 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-600/25 transition-all hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Get Started Free
              </button>
            </div>

            {/* Mobile Menu */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`lg:hidden p-2 rounded-lg ${isScrolled ? 'text-gray-700' : 'text-white'}`}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden bg-white border-t shadow-xl max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => scrollTo(item.id)} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-base active:bg-emerald-100 transition-colors">
                  {item.label}
                </button>
              ))}
              <div className="pt-3 border-t space-y-2">
                <button onClick={() => router.push('/login')} className="block w-full text-left px-4 py-3 text-gray-700 rounded-lg text-base">Sign In</button>
                <button onClick={() => router.push('/register')} className="block w-full text-center px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-base font-semibold">Get Started Free</button>
              </div>
            </div>
          </motion.div>
        )}
      </nav>


      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section id="home" ref={heroRef} className="relative min-h-[100dvh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.2) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)' }} />
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10 sm:pt-24 sm:pb-16">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left */}
              <div className="space-y-8">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm text-emerald-300 backdrop-blur-sm mb-6">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
                    Now with Real-Time BLE Machine Control
                  </span>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                    The Complete
                    <span className="block bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                      Dairy Cloud
                    </span>
                    <span className="block">Platform</span>
                  </h1>
                </motion.div>

                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-sm sm:text-base lg:text-lg text-white/60 max-w-xl leading-relaxed">
                  From milk analysis to farmer payments — manage your entire dairy operation in one powerful cloud platform. Connect Lactosure analyzers, track real-time quality, automate rate calculations, and generate instant reports.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => router.push('/register')} className="group px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold text-base sm:text-lg shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:from-emerald-600 hover:to-green-600 transition-all flex items-center justify-center gap-2">
                    Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => scrollTo('platform')} className="px-6 py-3 sm:px-8 sm:py-4 border border-white/20 text-white rounded-xl font-semibold text-base sm:text-lg backdrop-blur-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Play className="w-5 h-5" /> See How It Works
                  </button>
                </motion.div>

                {/* Trust signals */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-6 text-white/40 text-xs sm:text-sm pt-4">
                  <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> ISO Certified</div>
                  <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> SSL Encrypted</div>
                  <div className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Azure Cloud</div>
                </motion.div>
              </div>

              {/* Right — Dashboard Preview */}
              <motion.div initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.4, duration: 1 }}>
                <DashboardMockup />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          </div>
        </motion.div>
      </section>


      {/* ═══════════════════ STATS BAR ═══════════════════ */}
      <section className="relative z-20 -mt-8 sm:-mt-10 lg:-mt-12">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 grid grid-cols-2 lg:grid-cols-4">
            {[
              { value: 15, suffix: '+', label: 'Years of Innovation', icon: Award },
              { value: 5000, suffix: '+', label: 'Satisfied Customers', icon: Users },
              { value: 10000, suffix: '+', label: 'Machines Deployed', icon: Monitor },
              { value: 100, suffix: '+', label: 'Team Members', icon: Users },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center py-5 sm:py-7 px-3 sm:px-4 border-b lg:border-b-0 border-r border-gray-100 last:border-r-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r [&:nth-last-child(-n+2)]:border-b-0">
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mb-2" />
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-500 text-center mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════ ABOUT SECTION ═══════════════════ */}
      <section id="about" className="py-12 sm:py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">About Poornasree</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Crafting India&apos;s Fastest Ultrasonic Milk Analyzer Since 2011
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Poornasree Equipments is a leading brand in the milk testing equipment industry based in Ernakulam, Kerala. With 100+ dedicated employees across India, we manufacture the <strong>Lactosure Eco</strong> — India&apos;s fastest solar-powered ultrasonic milk analyzer — with a production capacity of 2,500 units per month across three production lines.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our multidisciplinary team of 20 R&D engineers has developed 7 analyzer models in 7 years. Adhering to ISO, CE, ZED, and IMEX standards, we deliver precision measurement of Fat, SNF, CLR, Protein, Lactose, Added Salt, Added Water & Temperature — ensuring quality dairy products reach consumers worldwide.
              </p>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { icon: Award, label: 'ISO 9001:2015', sub: 'Certified' },
                  { icon: Beaker, label: '7 Models', sub: 'Developed' },
                  { icon: Globe, label: 'Pan India', sub: '& Exports' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                    <item.icon className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-gray-900 text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.sub}</div>
                  </div>
                ))}
              </div>

              <blockquote className="border-l-4 border-emerald-500 pl-4 italic text-gray-600 text-sm">
                &ldquo;Since our inception, we have consistently pursued stable growth through an unwavering commitment to ethical business practices and quality in all aspects of our operations.&rdquo;
                <div className="mt-2 not-italic font-semibold text-gray-900">— Managing Director, Poornasree Equipments</div>
              </blockquote>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }} className="relative">
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { icon: Gauge, title: 'Ultra-Fast Analysis', desc: 'Fastest ultrasonic technology with 40-second test cycle' },
                  { icon: Droplets, title: 'Comprehensive Testing', desc: 'Fat, SNF, CLR, Protein, Lactose, Salt, Water, Temp' },
                  { icon: Zap, title: 'Solar Powered', desc: 'Built-in battery and solar panel for sustainable operation' },
                  { icon: Shield, title: 'Quality Assured', desc: 'ISO, CE, ZED, IMEX certified with 14-checkpoint QA' },
                  { icon: Settings, title: 'Custom Calibration', desc: 'Territory & customer specific calibrations with fresh milk' },
                  { icon: Target, title: '24hr Service', desc: 'Solution within 24 hours with strategically located engineers' },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <card.icon className="w-8 h-8 text-emerald-600 mb-2" />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{card.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 lg:mt-20">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-5 sm:p-8 text-white">
              <Target className="w-8 h-8 sm:w-10 sm:h-10 mb-3 sm:mb-4 text-emerald-200" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Our Mission</h3>
              <p className="text-white/80 leading-relaxed">Build the best products that create the most value for our customers, use business to inspire and implement environmentally friendly solutions for the dairy industry worldwide.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 sm:p-8 text-white">
              <Eye className="w-8 h-8 sm:w-10 sm:h-10 mb-3 sm:mb-4 text-emerald-400" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Our Vision</h3>
              <p className="text-white/80 leading-relaxed">Pioneer the integration of IoT, AI, and cloud technologies in dairy operations, empowering every farmer and dairy operator with real-time intelligence and seamless automation for a smarter agricultural future.</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ PLATFORM OVERVIEW ═══════════════════ */}
      <section id="platform" className="py-12 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Cloud Platform"
            title="Everything You Need to Run Your Dairy"
            description="PSR Cloud connects your milk analyzers, manages your entire farmer network, automates payments, and delivers powerful analytics — all from one unified platform."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {platformFeatures.map((f, i) => (
              <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} delay={i * 0.05} gradient={f.gradient} />
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════ DASHBOARD SHOWCASE ═══════════════════ */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Live Dashboard"
            title="Powerful Insights at a Glance"
            description="Watch your entire dairy operation unfold in real-time with interactive dashboards, collection trends, quality metrics, and top performer leaderboards."
          />

          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <DashboardMockup />
          </motion.div>

          {/* Dashboard features */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {[
              { icon: LineChart, title: '30-Day Trends', desc: 'Interactive line charts showing daily collection quantity, count, and quality over time' },
              { icon: BarChart2, title: 'Quality Metrics', desc: 'Average Fat% and SNF% breakdowns with weighted calculations by volume' },
              { icon: PieChart, title: 'Machine Distribution', desc: 'Pie chart breakdown of total, active, and online machines by type' },
              { icon: Activity, title: 'Section Pulse', desc: 'Live collection activity status for every society — active, paused, ended, or inactive' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center p-5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all">
                <f.icon className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-1 text-sm">{f.title}</h4>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════ FEATURES DEEP DIVE ═══════════════════ */}
      <section id="features" className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Key Features"
            title="Built for the Modern Dairy Industry"
            description="Every feature is designed with precision to solve real challenges faced by dairy farmers, society coordinators, BMC operators, and dairy administrators."
            light
          />

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start mb-12 lg:mb-20">
            {/* Reporting */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Smart Reporting System</h3>
              </div>
              <p className="text-white/60 mb-6">Three report types (Collection, Dispatch, Sales) with two data sources (Society, BMC) and six powerful comparison modes.</p>
              <div className="space-y-3">
                {[
                  'PDF & CSV export with customizable columns',
                  'Email reports directly from the dashboard',
                  '6 comparison modes: Collection vs Dispatch, BMC vs Society, and more',
                  'Deep-link filtering by society, date range, machine',
                  'Detailed records: Fat, SNF, CLR, Protein, Lactose, Salt, Water, Temp, Rate, Amount',
                  'Bulk delete with admin password confirmation'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Rate Charts */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Rate Chart Engine</h3>
              </div>
              <p className="text-white/60 mb-6">Upload CSV rate charts for each milk channel and automatically sync them to machines for instant rate calculation at collection point.</p>
              <div className="space-y-3">
                {[
                  'CSV upload with Fat/SNF/CLR/Rate data',
                  'Separate channels: Cow, Buffalo, Mixed',
                  'Society and BMC-level assignment',
                  'Shared charts across multiple societies',
                  'Rate lookup: search by Fat/SNF/CLR instantly',
                  'Auto-download to machines with sync status tracking'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Payments */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Automated Payments</h3>
              </div>
              <p className="text-white/60 mb-6">End-to-end payment automation from milk collection to farmer bank accounts. Configure payment cycles, gateways, and notification channels.</p>
              <div className="space-y-3">
                {[
                  'Paytm, UPI, Bank Transfer & Cash support',
                  'Automatic payment with configurable thresholds',
                  'Daily/Weekly/Biweekly/Monthly payment cycles',
                  'Transaction tracking: pending → processing → success/failed',
                  'WhatsApp, SMS & email payment notifications',
                  'Farmer bank details: Account, IFSC, UPI ID'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Analytics */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Deep Analytics</h3>
              </div>
              <p className="text-white/60 mb-6">Multi-dimensional analytics across Collections, Dispatches, and Sales with interactive charts and breakdowns across every hierarchy level.</p>
              <div className="space-y-3">
                {[
                  'Breakdown by Dairy, BMC, Society, Machine',
                  'Shift analysis: Morning vs Evening trends',
                  'Channel analysis: Cow vs Buffalo vs Mixed',
                  'Interactive bar, line & pie charts (Recharts)',
                  'Custom date range with all-time option',
                  'Weighted Fat/SNF/CLR/Protein/Lactose metrics'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Simple Workflow"
            title="How Poornasree Cloud Works"
            description="From milk collection at the farm gate to automated farmer payments — everything flows seamlessly through our cloud platform."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200" />

            <WorkflowStep step="1" icon={ScanLine} title="Milk Collection" description="Farmer brings milk to society. Lactosure analyzer tests quality — Fat, SNF, CLR, Protein, Lactose, Temperature — in under 40 seconds." delay={0} />
            <WorkflowStep step="2" icon={Cloud} title="Cloud Sync" description="Machine automatically uploads test data to Poornasree Cloud via API. Rate chart lookup calculates per-liter rate and total amount instantly." delay={0.15} />
            <WorkflowStep step="3" icon={BarChart3} title="Track & Report" description="Data flows into dashboards, analytics, and reports. Admins see real-time trends. Farmers view collection history on mobile app." delay={0.3} />
            <WorkflowStep step="4" icon={IndianRupee} title="Auto Payment" description="Payment period closes. Amounts are aggregated per farmer. Payments are processed automatically via Paytm, UPI, or bank transfer with notifications." delay={0.45} />
          </div>

          {/* Role Hierarchy */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-24">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3">Role-Based Access Hierarchy</h3>
            <p className="text-gray-500 text-center mb-6 sm:mb-10 max-w-xl mx-auto text-xs sm:text-sm">Every user sees exactly what they need — from system-wide monitoring for Super Admins to personal collection history for Farmers.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {[
                { role: 'Super Admin', desc: 'System-wide monitoring, approvals, database management', color: 'from-red-500 to-rose-600', icon: Shield },
                { role: 'Admin', desc: 'Organization owner with dedicated database schema', color: 'from-purple-500 to-indigo-600', icon: Lock },
                { role: 'Dairy', desc: 'Dairy facility management, BMC oversight', color: 'from-blue-500 to-blue-700', icon: Factory },
                { role: 'BMC', desc: 'Bulk Milk Cooling Center operations', color: 'from-cyan-500 to-teal-600', icon: Building2 },
                { role: 'Society', desc: 'Farmer coordination, collection monitoring', color: 'from-emerald-500 to-green-600', icon: Users },
                { role: 'Farmer', desc: 'Personal collection history, payments', color: 'from-amber-500 to-orange-600', icon: Wheat },
              ].map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 sm:px-5 py-3 shadow-sm hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0`}>
                    <r.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{r.role}</div>
                    <div className="text-xs text-gray-500">{r.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════ HARDWARE INTEGRATION ═══════════════════ */}
      <section id="hardware" className="py-12 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Hardware + Cloud"
            title="Seamless Machine Integration"
            description="Connect your Lactosure milk analyzers directly to the cloud via our Poornasree HUB dongle. BLE scanning, real-time data streaming, and live control panels."
          />

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <div className="space-y-3 sm:space-y-4">
                {[
                  { icon: Bluetooth, title: 'Bluetooth Low Energy (BLE)', desc: 'Scan and connect to nearby Poornasree, Lactosure, and Master-model machines wirelessly. Connect individual machines or all at once.' },
                  { icon: Cable, title: 'USB Serial Connection', desc: 'Connect the Poornasree HUB dongle via USB for stable, high-speed data transfer using Web Serial API.' },
                  { icon: Activity, title: 'Real-Time Data Streaming', desc: 'Live milk analysis data streams from machines to the control panel — Fat, SNF, CLR, Protein, Lactose, Salt, Water, and Temperature.' },
                  { icon: Radio, title: 'Machine-to-Cloud API', desc: 'Machines sync collection, dispatch, and sales data directly to the cloud via RESTful APIs with unique PSR codes.' },
                  { icon: Download, title: 'Rate Chart Auto-Sync', desc: 'Rate charts upload from admin, download automatically to machines. Track download status and force re-sync when needed.' },
                  { icon: Cpu, title: 'Supported Models', desc: 'Lactosure, Lactosure Eco, Ekomilk, Ultrasonic, and Master milk analyzers — with machine-specific protocol parsing.' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <MachineControlMockup />
              <p className="text-center text-sm text-gray-500 mt-6">Live Machine Control Panel — Real-time milk analysis monitoring</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ MOBILE APP ═══════════════════ */}
      <section id="mobile" className="py-12 sm:py-16 lg:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-2 lg:order-1">
              <PhoneMockup />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2 space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">Mobile App</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                Poornasree Connect — Your Dairy in Your Pocket
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Our Flutter-based mobile app gives farmers, society coordinators, and admins instant access to their dashboards, collection history, rate charts, and payment records — anytime, anywhere.
              </p>

              <div className="space-y-3">
                {[
                  { icon: Smartphone, text: 'Farmer dashboard: view collections, quality, payments' },
                  { icon: FileText, text: 'Society reports with PDF & CSV export' },
                  { icon: Calculator, text: 'Rate chart lookup by Fat/SNF/CLR' },
                  { icon: Bell, text: 'Push notifications for collections & payments' },
                  { icon: Languages, text: 'English, Hindi & Malayalam interface' },
                  { icon: Bluetooth, text: 'BLE machine scanning & connection' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                  <Download className="w-4 h-4" />
                  Download on Play Store
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section id="testimonials" className="py-12 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Client Success"
            title="Trusted by Dairy Operators Across India"
            description="Hear from dairy administrators, society coordinators, and BMC operators who have transformed their operations with Poornasree Cloud."
          />

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed italic">&ldquo;{t.feedback}&rdquo;</p>
                <div className="border-t border-gray-100 pt-3">
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.role}</div>
                  <div className="text-xs text-emerald-600">{t.location}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="FAQ"
            title="Frequently Asked Questions"
            description="Everything you need to know about Poornasree Cloud."
          />

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                  {activeFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </button>
                {activeFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-4">
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Ready to Transform Your Dairy Operations?
            </h2>
            <p className="text-white/80 text-sm sm:text-base lg:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto">
              Join thousands of dairy operators across India who have already modernized their milk collection, quality testing, and farmer payment workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="group px-6 py-3 sm:px-10 sm:py-4 bg-white text-emerald-700 rounded-xl font-bold text-base sm:text-lg shadow-2xl hover:shadow-3xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo('contact')}
                className="px-6 py-3 sm:px-10 sm:py-4 border-2 border-white/40 text-white rounded-xl font-semibold text-base sm:text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" /> Contact Sales
              </button>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════ CONTACT SECTION ═══════════════════ */}
      <section id="contact" className="py-12 sm:py-16 lg:py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Get in Touch"
            title="We'd Love to Hear From You"
            description="Ready to revolutionize your dairy operations? Reach out to our team for a demo, pricing, or any questions."
            light
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Head Office */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4">Head Office (Kerala)</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-white/70 text-sm">13/191-C, Mannoor Road, Maradu P.O, Ernakulam - 682304</div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-white/70 text-sm">+91 484 4859291</div>
                    <div className="text-white/70 text-sm">+91 94009 61291</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="text-white/70 text-sm">online.poornasree@gmail.com</div>
                </div>
              </div>
            </motion.div>

            {/* Design Office */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4">Poornasree Designs</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-white/70 text-sm">Harigovindam (KRPS 274), Kattithara Sahakarana Road, Maradu P.O, Ernakulam - 682304</div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="text-white/70 text-sm">+91 80757 90438</div>
                </div>
              </div>
            </motion.div>

            {/* North India Office */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4">North India (Delhi)</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-white/70 text-sm">Shop No. 12, First Floor, Co-Operative Cold Storage Market, Siyana Road, Bulandshahr - 203001 (UP)</div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="text-white/70 text-sm">+91 96057 57816</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Social Links */}
          <div className="flex justify-center gap-4 mt-12">
            <a href="https://www.facebook.com/profile.php?id=100092352830566" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/company/inpoornasree-equipments/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://www.youtube.com/channel/UCk_0HmHgoQKImHsTcZtDshA" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-red-600 transition-all">
              <Youtube className="w-5 h-5" />
            </a>
          </div>

          {/* CTA Box */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-10 sm:mt-12 lg:mt-16 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl p-5 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Start Your Free Trial Today</h3>
            <p className="text-white/60 mb-4 sm:mb-6 max-w-xl mx-auto text-sm sm:text-base">
              Experience the full power of Poornasree Cloud. No credit card required. Set up your account and start managing your dairy operations in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/register')}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold shadow-lg hover:from-emerald-600 hover:to-green-600 transition-all"
              >
                Create Account
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-3 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-black text-white py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <Image src="/fulllogo.png" alt="Poornasree" width={24} height={24} className="object-contain" />
                </div>
                <span className="font-bold text-lg">Poornasree Cloud</span>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                India&apos;s leading dairy equipment cloud platform. Connecting Lactosure milk analyzers to the power of the cloud since 2011.
              </p>
              <div className="flex gap-3">
                <a href="https://www.facebook.com/profile.php?id=100092352830566" className="text-gray-400 hover:text-white transition-colors"><Facebook className="w-4 h-4" /></a>
                <a href="https://www.linkedin.com/company/inpoornasree-equipments/?viewAsMember=true" className="text-gray-400 hover:text-white transition-colors"><Linkedin className="w-4 h-4" /></a>
                <a href="https://www.youtube.com/channel/UCk_0HmHgoQKImHsTcZtDshA" className="text-gray-400 hover:text-white transition-colors"><Youtube className="w-4 h-4" /></a>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-300">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {['Dashboard', 'Reports & Analytics', 'Machine Control', 'Rate Charts', 'Payment Processing', 'Farmer Management'].map((item, i) => (
                  <li key={i}><span className="hover:text-emerald-400 cursor-pointer transition-colors">{item}</span></li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-300">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="https://poornasree.com/about/" target="_blank" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                <li><a href="https://poornasree.com/products/" target="_blank" className="hover:text-emerald-400 transition-colors">Products</a></li>
                <li><a href="https://poornasree.com/" target="_blank" className="hover:text-emerald-400 transition-colors">Company Website</a></li>
                <li><span className="hover:text-emerald-400 cursor-pointer transition-colors">Careers</span></li>
                <li><span className="hover:text-emerald-400 cursor-pointer transition-colors">Privacy Policy</span></li>
                <li><span className="hover:text-emerald-400 cursor-pointer transition-colors">Terms of Service</span></li>
              </ul>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-300">Products</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {['Lactosure Eco Analyzer', 'Lactosure Milk Analyzer', 'Ultrasonic Stirrers', 'Display Units', 'Data Processing Units', 'Poornasree Connect App'].map((item, i) => (
                  <li key={i}><span className="hover:text-emerald-400 cursor-pointer transition-colors">{item}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Poornasree Equipments. All rights reserved. Established 2011.
            </p>
            <div className="flex items-center gap-3 text-gray-500 text-xs">
              <a href="https://poornasree.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <ExternalLink className="w-3 h-3" /> poornasree.com
              </a>
              <span>&bull;</span>
              <span>Made in India 🇮🇳</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
