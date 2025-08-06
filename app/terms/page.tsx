'use client';

import Header from '@/pc/auth/header';
import Footer from '@/pc/layout/footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <div className="theme-card rounded-lg p-8">
          <h1 className="text-3xl font-bold theme-text-primary mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none theme-text-secondary space-y-6">
            <p className="text-lg theme-text-primary">
              Last updated: January 2025
            </p>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Acceptance of Terms</h2>
              <p>
                By accessing and using resumelove, you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not 
                use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Description of Service</h2>
              <p>
                resumelove is an intelligent resume and cover letter generation service. We provide tools 
                to help you create tailored resumes and cover letters based on job descriptions and your 
                professional information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">User Accounts and Responsibilities</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Maintaining the confidentiality of your account information</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring the accuracy of information you provide</li>
                <li>Using the service in compliance with applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction</li>
                <li>Transmit any harmful or malicious code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the service to create false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Subscription and Payment</h2>
              <p>
                Some features require a paid subscription. By subscribing, you agree to pay all charges 
                at the prices then in effect for your subscription. Subscriptions automatically renew 
                unless cancelled. You may cancel your subscription at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Intellectual Property</h2>
              <p>
                The service and its original content, features, and functionality are owned by resumelove 
                and are protected by international copyright, trademark, patent, trade secret, and other 
                intellectual property laws.
              </p>
              <p>
                You retain ownership of the content you provide, including your resume information. 
                By using our service, you grant us permission to use this content solely to provide 
                the resume generation service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Limitation of Liability</h2>
              <p>
                In no event shall resumelove be liable for any indirect, incidental, special, consequential, 
                or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
                or other intangible losses, resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Service Availability</h2>
              <p>
                We strive to provide reliable service but do not guarantee that the service will be 
                uninterrupted or error-free. We reserve the right to modify, suspend, or discontinue 
                the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any 
                material changes via email or through the service. Continued use of the service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold theme-text-primary mb-4">Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at{' '}
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