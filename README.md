# PhishSafe - Security Awareness Platform

PhishSafe is a responsive Phishing Simulation as a Service platform for authorized security-awareness training. Clients purchase services and submit simulation requests; administrators review every request before delivery.

## Features

-   **Role-aware Workspace**: One login for clients and administrators.
-   **Approval Workflow**: Campaigns remain pending until an administrator approves them.
-   **Service Billing**: Stripe-hosted monthly subscription checkout.
-   **Campaign Management**: Create campaigns for authorized employee groups.
-   **Email Templates**: Customizable HTML email templates with dynamic tracking links.
-   **Audience Builder**: Write or paste validated recipients using `email@example.com, Name;` format.
-   **Starter Libraries**: Seed 12 email templates and 12 educational landing pages for every current account.
-   **AI Landing-page Generator**: Upload reference photos and a comment, and the AI provider (Alibaba Cloud Model Studio) drafts a self-contained HTML page into the editor for review before you save it (nothing is auto-saved).
-   **AI Email Templates**: The email-template builder can also draft HTML email bodies with AI, which you can edit in the UI before saving.
-   **Real-time Tracking**: Track email opens, link clicks, and compromised credentials (simulated).
-   **Interactive Dashboard**: View campaign statistics and detailed event logs in real-time.
-   **Fake Login Pages**: Realistic login pages to capture "compromised" events (credentials are NOT stored).
-   **Responsive Design**: Modern, dark-mode compatible UI built with Tailwind CSS.

## Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Authentication**: Supabase Auth
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Email**: [Nodemailer](https://nodemailer.com/) (SMTP)
-   **Payments**: [Stripe Checkout](https://stripe.com/payments/checkout)
-   **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

-   Node.js 18+
-   npm or yarn
-   A Supabase project
-   An SMTP provider (e.g., Gmail App Password, SendGrid, Resend)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/phishsim.git
    cd phishsim
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add the following:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    NEXT_PUBLIC_APP_URL=http://localhost:3000

    # SMTP Configuration
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_app_password
    SMTP_FROM="Security Team <security@yourdomain.com>"

    # Stripe test-mode secret key
    STRIPE_SECRET_KEY=sk_test_...

    # AI provider — Alibaba Cloud Model Studio (powers landing-page and email-template generation)
    DASHSCOPE_API_KEY=
    # Required for Token Plans: copy the "Plan Exclusive Base URL" from the Model Studio console.
    # Defaults to the international endpoint https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    DASHSCOPE_BASE_URL=
    # A model with Visual Understanding (defaults to deepseek-v4.1-flash)
    DEEPSEEK_MODEL=deepseek-v4.1-flash
    ```

    > The AI generators (landing pages and email templates) are powered by the AI provider (Alibaba Cloud Model Studio):
    >
    > -   Set `DASHSCOPE_API_KEY` to enable AI generation. Reference images are read by the model; videos are not used.
    > -   For a Token Plan, also set `DASHSCOPE_BASE_URL` to the plan-exclusive base URL from the console, or the key returns a 401.
    > -   `DEEPSEEK_MODEL` selects the model (defaults to `deepseek-v4.1-flash`).
    >
    > The AI provider is optional. If the key is missing, the Generate action returns a friendly "not configured" error and the rest of the app works normally.

4.  **Database Setup:**
    For a new database, run `supabase/schema.sql`, then run `supabase/migrations/20261021_roles_approvals_billing.sql` in the Supabase SQL editor. Existing projects only need the migration.
    -   `campaigns`
    -   `email_templates`
    -   `groups`
    -   `targets`
    -   `events`
    -   `landing_pages`
    -   `orders`

5.  **Run the development server on port 3000:**
    ```bash
    npm run dev
    ```

6.  **Open the app:**
    Navigate to [http://localhost:3000](http://localhost:3000).

## Usage

1.  **Login**: Sign in with your account.
2.  **Create Resources**:
    -   Go to **Templates** to create an email template.
    -   Go to **Groups** to upload a CSV of targets.
3.  **Request Campaign**:
    -   Go to **Campaigns** -> **New Campaign**.
    -   Select a template and a target group.
    -   Click **Submit for approval**.
4.  **Admin Review**:
    -   Sign in as `gradinarumanuel99@gmail.com` or `alexxperian@gmail.com`.
    -   Open **Approvals** and approve or reject the request.
5.  **Track Progress**:
    -   Click on the campaign in the dashboard to view real-time stats and logs.

## Security Note

This tool is for **educational and authorized testing purposes only**. Do not use this tool to target individuals or organizations without their explicit permission. The "fake login" pages in this project are designed to simulate credential harvesting but **do not store** any submitted passwords.

## License

MIT
