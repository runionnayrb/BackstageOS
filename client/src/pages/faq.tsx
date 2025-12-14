import { useState } from "react";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const FAQ_DATA = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "How do I create a new show?",
        answer: "From your dashboard, click the 'Create Show' button. Enter your show's name and basic details, then you'll be taken to your new show's home page where you can start adding reports, schedules, contacts, and more."
      },
      {
        question: "How do I navigate between different sections?",
        answer: "Click on any show from your dashboard to enter it. Inside a show, you'll see organized sections like Reports, Calendar, Contacts, and more. Use the navigation menu to switch between sections, or click your show name to return to the show overview."
      },
      {
        question: "Can I have multiple shows at once?",
        answer: "Yes! BackstageOS is designed to handle multiple productions. Each show is completely separate with its own reports, schedules, contacts, and data. Switch between shows from your main dashboard."
      },
      {
        question: "What's the best way to get started with a new production?",
        answer: "We recommend starting by: 1) Creating your show, 2) Adding your team contacts, 3) Setting up your schedule, and 4) Creating your first report. Each section has helpful prompts to guide you through the process."
      }
    ]
  },
  {
    category: "Team Collaboration",
    questions: [
      {
        question: "How many team members can I invite to my show?",
        answer: "You can invite unlimited team members as editors to collaborate on your shows. Editors can access and work on reports, schedules, notes, and other show content alongside you."
      },
      {
        question: "What can invited editors access?",
        answer: "Editors you invite can view and manage notes, reports, contacts, and schedules for the shows they're invited to. They have full access to collaborate on content but cannot delete the show or manage billing."
      },
      {
        question: "How do I invite someone to my show?",
        answer: "Go to your show's settings and find the Team section. Enter your team member's email address to send them an invitation. Once they accept, they'll have access to collaborate on that show."
      },
      {
        question: "Can team members see each other's changes?",
        answer: "Yes! All changes sync in real-time. When one team member updates a report or schedule, others will see the changes immediately. This keeps everyone on the same page."
      }
    ]
  },
  {
    category: "Reports",
    questions: [
      {
        question: "What types of reports are available?",
        answer: "BackstageOS includes several report types: Production Reports, Rehearsal Reports, Performance Reports, and more. Each type is designed for specific stages of your production with appropriate fields and formats."
      },
      {
        question: "How do I create a custom template?",
        answer: "Go to your show's template settings to create custom report templates. You can add sections, fields, and organize them by department. Your templates can be reused across multiple reports and shows."
      },
      {
        question: "How does notes tracking work?",
        answer: "Notes entered in department-specific fields are automatically tracked and can be filtered by status (pending, in progress, resolved). Assign notes to team members and track completion across all your reports."
      },
      {
        question: "Can I export or share my reports?",
        answer: "Yes! Reports can be exported as PDFs for easy sharing. You can also email reports directly to distribution lists you set up within BackstageOS."
      }
    ]
  },
  {
    category: "Schedules & Calendar",
    questions: [
      {
        question: "How do I publish a schedule?",
        answer: "After creating your schedule in the Calendar section, click 'Publish' to make it available to your team. Published schedules include version tracking so everyone knows when updates are made."
      },
      {
        question: "What are personal schedule links?",
        answer: "Each team member can get a personalized schedule link that shows only the events they're called for. Share these links so individuals can add their personal schedule to their phone's calendar app."
      },
      {
        question: "Can I create schedule templates?",
        answer: "Yes! Save any week's schedule as a template to reuse for similar weeks. This is great for recurring rehearsal patterns or tech week schedules that follow a standard format."
      },
      {
        question: "How do I handle schedules that run past midnight?",
        answer: "BackstageOS supports extended schedules (like 7 AM to 2 AM). Events in the 'after midnight' portion display correctly and can be dragged and edited just like regular daytime events."
      }
    ]
  },
  {
    category: "Billing & Subscription",
    questions: [
      {
        question: "What subscription plans are available?",
        answer: "BackstageOS offers subscription plans designed for stage managers and production teams. Visit the Billing section in your account settings to see current plan options and pricing."
      },
      {
        question: "What features are included in my subscription?",
        answer: "Your subscription includes unlimited shows, reports, schedules, and team collaboration. You also get email integration, personal schedule links, and access to all our production management tools."
      },
      {
        question: "How do I manage my subscription?",
        answer: "Go to Settings > Billing to view your current plan, update payment methods, or modify your subscription. You can upgrade, downgrade, or cancel at any time."
      },
      {
        question: "Is there a free trial?",
        answer: "New users can explore BackstageOS with our trial period. Check our current offers on the subscription page for the latest trial availability and terms."
      }
    ]
  },
  {
    category: "Data & Privacy",
    questions: [
      {
        question: "Where is my data stored?",
        answer: "Your data is securely stored on encrypted servers with industry-standard security measures. We use trusted cloud infrastructure providers with data centers in the United States."
      },
      {
        question: "Is my data secure?",
        answer: "Yes! We use encryption for data in transit and at rest, secure authentication practices, and regular security audits. Your production data is protected with the same standards used by major tech companies."
      },
      {
        question: "Can I export my data?",
        answer: "Yes, you can export your reports as PDFs and your schedule data for personal calendars. If you need a complete data export, contact our support team."
      },
      {
        question: "Who can see my show data?",
        answer: "Only you and team members you explicitly invite can access your show data. BackstageOS staff do not access your production content except when required for technical support you request."
      }
    ]
  }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredData = FAQ_DATA.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const totalResults = filteredData.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <p className="text-sm opacity-75 tracking-wide">Backstage<span className="font-semibold">OS</span></p>
          </div>
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <HelpCircle className="h-10 w-10" />
            Frequently Asked Questions
          </h1>
          <p className="text-xl opacity-90">Find answers to common questions about BackstageOS</p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white"
          />
        </div>
        {searchQuery && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No results found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try a different search term or browse all categories below.</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredData.map((category) => (
              <div key={category.category}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                  {category.category}
                </h2>
                <div className="space-y-3">
                  {category.questions.map((item, index) => {
                    const itemId = `${category.category}-${index}`;
                    const isExpanded = expandedItems.has(itemId);
                    
                    return (
                      <div 
                        key={itemId}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900"
                      >
                        <button
                          onClick={() => toggleItem(itemId)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="font-medium text-slate-900 dark:text-white pr-4">
                            {item.question}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-slate-700 pt-4 bg-white dark:bg-slate-950">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Still have questions?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We're here to help! Reach out to our support team and we'll get back to you as soon as possible.
          </p>
          <a 
            href="mailto:support@backstageos.com"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Back to App */}
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← Back to BackstageOS
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-8 px-4 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 BackstageOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
