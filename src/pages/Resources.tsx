import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, BookOpen, Download, Phone, HelpCircle,
  ExternalLink, FileText, DollarSign, MapPin, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const scamRedFlags = [
  {
    title: "Requests for payment before viewing",
    description: "Legitimate landlords never ask for money before you've seen the property. If someone asks for a deposit, holding fee, or rent before an inspection, it's almost certainly a scam.",
    action: "Never send money before viewing a property in person.",
  },
  {
    title: "Landlord overseas or unreachable",
    description: "Scammers often claim to be overseas and unable to show the property. They may offer to send keys after payment.",
    action: "Insist on meeting the landlord or their agent in person.",
  },
  {
    title: "Price too good to be true",
    description: "If the rent is significantly below market rate for the area, it's likely a scam designed to attract desperate renters.",
    action: "Research average rents in the area before applying.",
  },
  {
    title: "Pressure to act immediately",
    description: "Scammers create urgency with phrases like 'many people interested' or 'must pay today' to prevent you from thinking clearly.",
    action: "Take your time. Legitimate properties will still be available tomorrow.",
  },
  {
    title: "Suspicious payment methods",
    description: "Requests for wire transfers, cryptocurrency, gift cards, or cash-only payments are major red flags.",
    action: "Only pay through official channels and get receipts.",
  },
  {
    title: "No inspection allowed",
    description: "If you can't view the property before signing a lease, something is wrong. Virtual-only viewings for local properties are suspicious.",
    action: "Always inspect a property in person before committing.",
  },
  {
    title: "Duplicate or stolen photos",
    description: "Scammers steal photos from legitimate listings. Reverse image search can reveal if photos appear on multiple listings.",
    action: "Use Google reverse image search to verify listing photos.",
  },
];

const stateResources = [
  {
    state: "NSW",
    authority: "NSW Fair Trading",
    phone: "13 32 20",
    website: "https://www.fairtrading.nsw.gov.au",
    bond: "Rental Bonds Online",
    emergency: "Link2Home: 1800 152 152",
  },
  {
    state: "VIC",
    authority: "Consumer Affairs Victoria",
    phone: "1300 558 181",
    website: "https://www.consumer.vic.gov.au",
    bond: "Residential Tenancies Bond Authority",
    emergency: "Housing Vic: 1800 825 955",
  },
  {
    state: "QLD",
    authority: "Residential Tenancies Authority",
    phone: "1300 366 311",
    website: "https://www.rta.qld.gov.au",
    bond: "RTA Bond Lodgement",
    emergency: "Housing Service Centre: 1300 880 882",
  },
  {
    state: "SA",
    authority: "Consumer and Business Services",
    phone: "131 882",
    website: "https://www.cbs.sa.gov.au",
    bond: "CBS Bond Management",
    emergency: "Housing SA: 1800 509 378",
  },
  {
    state: "WA",
    authority: "Consumer Protection WA",
    phone: "1300 304 054",
    website: "https://www.commerce.wa.gov.au",
    bond: "Bond Administrator",
    emergency: "Entrypoint Perth: 1800 124 684",
  },
  {
    state: "TAS",
    authority: "Consumer, Building and Occupational Services",
    phone: "1300 654 499",
    website: "https://www.cbos.tas.gov.au",
    bond: "Rental Deposit Authority",
    emergency: "Housing Connect: 1800 800 588",
  },
];

const templates = [
  { name: "Rental Application Template", desc: "Standard rental application form", icon: FileText },
  { name: "Bond Refund Request", desc: "Letter template for bond refund", icon: DollarSign },
  { name: "Repair Request Template", desc: "Formal repair request letter", icon: FileText },
  { name: "Lease Break Notification", desc: "Notice to break lease early", icon: FileText },
  { name: "Complaint Letter Template", desc: "Formal complaint to landlord", icon: AlertTriangle },
];

const faqs = [
  {
    q: "Is SafeRent AI really free?",
    a: "Yes! SafeRent AI is completely free for all users. We believe everyone deserves access to safe rental housing tools.",
  },
  {
    q: "How accurate is scam detection?",
    a: "Our AI analyzes multiple factors including listing patterns, pricing data, and known scam indicators. While no system is 100% accurate, we catch the vast majority of common rental scams.",
  },
  {
    q: "What happens to my documents?",
    a: "Your documents are encrypted and stored securely. They are only shared with property managers when you explicitly submit an application. You can delete them at any time.",
  },
  {
    q: "Can landlords see my information?",
    a: "Landlords only see the information you include in your application. Your scam scan history, saved listings, and other activity remain private.",
  },
  {
    q: "How long do applications take?",
    a: "With SafeRent AI, you can submit an application in under 5 minutes. Processing time depends on the landlord or property manager.",
  },
];

export default function Resources() {
  const [activeState, setActiveState] = useState("NSW");
  const currentState = stateResources.find((s) => s.state === activeState)!;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div {...fadeUp} className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Tenant Resources & Support</h1>
        <p className="text-lg text-dark-500 max-w-2xl mx-auto">
          Everything you need to know about renting safely in Australia
        </p>
      </motion.div>

      {/* Scam Detection */}
      <motion.section {...fadeUp} transition={{ delay: 0.1 }} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-danger-600" />
          </div>
          <h2 className="text-2xl font-bold">How to Spot Scams</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {scamRedFlags.map((flag, index) => (
            <AccordionItem
              key={index}
              value={`flag-${index}`}
              className="bg-white rounded-xl border border-dark-100 px-5"
            >
              <AccordionTrigger className="text-left font-medium py-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  {flag.title}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="text-dark-500 mb-3">{flag.description}</p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-success-50 text-success-700 text-sm">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>What to do:</strong> {flag.action}</span>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

      {/* State Resources */}
      <motion.section {...fadeUp} transition={{ delay: 0.2 }} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold">State Resources</h2>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {stateResources.map((s) => (
            <button
              key={s.state}
              onClick={() => setActiveState(s.state)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeState === s.state
                  ? "bg-primary-500 text-white"
                  : "bg-dark-100 text-dark-600 hover:bg-dark-200"
              }`}
            >
              {s.state}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-dark-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold">{currentState.authority}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-50">
              <Phone className="w-4 h-4 text-dark-400" />
              <div>
                <p className="text-xs text-dark-400">Phone</p>
                <p className="text-sm font-medium">{currentState.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-50">
              <ExternalLink className="w-4 h-4 text-dark-400" />
              <div>
                <p className="text-xs text-dark-400">Website</p>
                <a
                  href={currentState.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-500 hover:underline"
                >
                  Visit Website
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-50">
              <DollarSign className="w-4 h-4 text-dark-400" />
              <div>
                <p className="text-xs text-dark-400">Bond</p>
                <p className="text-sm font-medium">{currentState.bond}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-danger-50">
              <AlertTriangle className="w-4 h-4 text-danger-500" />
              <div>
                <p className="text-xs text-danger-500">Emergency Housing</p>
                <p className="text-sm font-medium">{currentState.emergency}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Templates */}
      <motion.section {...fadeUp} transition={{ delay: 0.3 }} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center">
            <Download className="w-5 h-5 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold">Downloadable Templates</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.name}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-dark-100 hover:border-dark-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-dark-50 flex items-center justify-center">
                  <template.icon className="w-5 h-5 text-dark-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-dark-400">{template.desc}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Centrelink Support */}
      <motion.section {...fadeUp} transition={{ delay: 0.4 }} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-warning-600" />
          </div>
          <h2 className="text-2xl font-bold">Centrelink Support</h2>
        </div>
        <div className="bg-white rounded-xl border border-dark-100 p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary-50">
              <h4 className="font-semibold text-sm mb-2">Commonwealth Rent Assistance</h4>
              <p className="text-xs text-dark-500 mb-2">
                Extra payment for eligible Centrelink recipients who rent in the private market.
              </p>
              <Badge variant="secondary" className="text-xs">Up to $188.20/fortnight</Badge>
            </div>
            <div className="p-4 rounded-lg bg-success-50">
              <h4 className="font-semibold text-sm mb-2">Who Qualifies?</h4>
              <ul className="text-xs text-dark-500 space-y-1">
                <li>• Receiving Centrelink payment</li>
                <li>• Paying rent above threshold</li>
                <li>• Not in public housing</li>
                <li>• Rent verified by landlord</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-warning-50">
              <h4 className="font-semibold text-sm mb-2">How to Apply</h4>
              <p className="text-xs text-dark-500">
                Apply through myGov or call Centrelink on <strong>132 850</strong>. You'll need your
                lease agreement and landlord details.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-dark-50">
              <h4 className="font-semibold text-sm mb-2">Contact</h4>
              <p className="text-xs text-dark-500">
                Phone: <strong>132 850</strong><br />
                Online: <strong>my.gov.au</strong><br />
                In person: Visit your local Centrelink office
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section {...fadeUp} transition={{ delay: 0.5 }} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="bg-white rounded-xl border border-dark-100 px-5"
            >
              <AccordionTrigger className="text-left font-medium py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-dark-500">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.section>

      {/* Contact Support */}
      <motion.section {...fadeUp} transition={{ delay: 0.6 }}>
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Need More Help?</h2>
          <p className="text-primary-100 mb-6">
            Our support team is here to help you navigate the rental process
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="secondary" className="bg-white text-primary-600 hover:bg-primary-50">
              <Mail className="w-4 h-4 mr-2" />
              support@saferent.ai
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report a Scam
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

