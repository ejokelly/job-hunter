'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <div className="theme-card rounded-lg p-8">
          <h1 className="text-3xl font-bold theme-text-primary mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none theme-text-secondary space-y-6">
            <p className="text-lg theme-text-primary">
              Last updated: January 2025
            </p>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                upload your resume, or contact us for support. This includes:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Email address and name</li>
                <li>Resume content and job descriptions you provide</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Usage data to improve our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Provide, maintain, and improve our resume generation service</li>
                <li>Process your payments and manage your subscription</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Information Sharing</h2>
              <p className="font-semibold theme-text-primary">
                We do not share, sell, or rent your personal information to third parties.
              </p>
              <p>
                We may share your information only in the following limited circumstances:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>With service providers who help us operate our service (like Stripe for payments)</li>
                <li>If required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. Your data is encrypted in 
                transit and at rest.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide 
                you services. You may request deletion of your account and data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:helpme@resumelove.app" className="theme-text-accent hover:underline">
                  helpme@resumelove.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}