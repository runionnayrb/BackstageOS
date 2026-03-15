import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicHeader from "@/components/public-header";
import PublicFooter from "@/components/public-footer";
import { 
  Calendar, 
  Phone, 
  Users, 
  MapPin, 
  FileText, 
  Mail, 
  Download, 
  FileCode, 
  Package, 
  Shirt,
  UsersRound,
  Eye,
  ArrowRight,
  Check
} from "lucide-react";

const features = [
  { icon: Calendar, title: "Drag and drop schedules", description: "Build your production calendar with intuitive scheduling" },
  { icon: Phone, title: "Automated daily calls", description: "Generate call sheets that update when your schedule changes" },
  { icon: Users, title: "Personalized schedules", description: "Each team member sees only what applies to them" },
  { icon: MapPin, title: "Availability tracking", description: "Track people and location availability, avoid double bookings" },
  { icon: FileText, title: "Custom reports with notes tracking", description: "Professional reports that automatically include your notes" },
  { icon: Mail, title: "Integrated email", description: "Outlook available, Gmail coming soon" },
  { icon: Download, title: "Email and PDF documents", description: "Send or download your reports in any format" },
  { icon: FileCode, title: "Document templates", description: "Templates that pull data directly from BackstageOS" },
  { icon: Package, title: "Props management", description: "Track every prop across scenes and acts" },
  { icon: Shirt, title: "Costume tracking", description: "Manage costume assignments and changes" },
  { icon: UsersRound, title: "Unlimited users", description: "Add your entire team at no extra cost" },
];

const steps = [
  { number: "1", title: "Create a show", description: "Set up your production with basic details" },
  { number: "2", title: "Add your data", description: "Import people, locations, and build your schedule" },
  { number: "3", title: "Generate everything", description: "Daily calls, reports, and documents from one source of truth" },
];

export default function BetaHome() {
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Your production lives in one place
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Schedules, reports, contacts, and documents connected in a single system. 
            No more scattered spreadsheets, no more version confusion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth?mode=signup">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-create-account">
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {/* HIDDEN FOR NOW - Unhide when ready to go public
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-pricing">
                View Pricing
              </Button>
            </Link>
            */}
          </div>
          
          <p className="text-sm text-gray-500">
            Beta access is currently limited
          </p>
        </div>
      </section>

      <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything you need to run a production
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How it works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {number}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            About the beta
          </h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600">This is an early beta, some features are still in development</p>
            </div>
            <div className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600">Your feedback directly shapes what we build next</p>
            </div>
            <div className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600">We ship fixes quickly and improve steadily</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              Have questions or feedback? Reach us at{" "}
              <a 
                href="mailto:support@backstageos.com" 
                className="text-primary hover:underline"
              >
                support@backstageos.com
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to simplify your production?
          </h2>
          <p className="text-gray-600 mb-8">
            Join stage managers who are organizing their shows in one calm, reliable place.
          </p>
          <Link href="/auth?mode=signup">
            <Button size="lg" data-testid="button-cta-create-account">
              Create Your Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
