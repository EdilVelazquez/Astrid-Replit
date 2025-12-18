import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ALLOWED_DOMAINS = [
  'numaris.com',
  'easytrack.mx',
  'tcvsat.com',
  'traffilogla.com',
  'sfleet.mx'
];

function isAllowedDomain(email: string): boolean {
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith(`@${domain}`));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if email has an allowed domain
    if (isAllowedDomain(email)) {
      return new Response(
        JSON.stringify({
          allowed: true,
          reason: 'Company email domain'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has assigned services (for non-company domains)
    const { data: services, error } = await supabase
      .from('expedientes_servicio')
      .select('email_tecnico')
      .eq('email_tecnico', email.toLowerCase())
      .limit(1);

    if (error) {
      console.error('Error checking services:', error);
      return new Response(
        JSON.stringify({ allowed: false, reason: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (services && services.length > 0) {
      return new Response(
        JSON.stringify({
          allowed: true,
          reason: 'Has assigned services'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Not allowed
    return new Response(
      JSON.stringify({
        allowed: false,
        reason: 'Email domain not allowed and no assigned services'
      }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in validate-registration:', error);
    return new Response(
      JSON.stringify({ allowed: false, reason: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
