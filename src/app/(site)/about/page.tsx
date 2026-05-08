import { NibbleCard } from "@/components/ui/nibble-card";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <section className="px-6 py-section">
      <NibbleCard bite="tr" className="mx-auto max-w-3xl p-8 md:p-12">
        <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
          About Us
        </p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-primary md:text-4xl">
          Hi, I&rsquo;m Tess!
        </h1>
        <div className="mt-6 space-y-4 text-on-surface">
          <p>
            By day, I&rsquo;m an educator who loves creating engaging, welcoming spaces
            for students to learn and grow. Outside the classroom, I channel that same
            creativity into baking homemade cookies and treats inspired by comfort,
            nostalgia, and seasonal flavors.
          </p>
          <p>
            What started as baking for friends and family quickly turned into sharing
            cookie boxes, custom treats, and creative recipes with others in my community.
            I love combining classic flavors with fun twists and creating desserts that
            feel both thoughtful and homemade.
          </p>
          <p>
            Whether you&rsquo;re here to order cookies, follow along with seasonal
            specials, or simply support a small business, I&rsquo;m so glad you&rsquo;re here.
          </p>
        </div>
      </NibbleCard>
    </section>
  );
}
