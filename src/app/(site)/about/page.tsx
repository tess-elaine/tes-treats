import Image from "next/image";
import { BiteButton } from "@/components/ui/bite-button";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 pb-12 pt-16 md:pb-24 md:pt-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
              About Us
            </p>
            <h1 className="mt-4 font-headline text-5xl font-black leading-[1.05] tracking-tight text-primary md:text-6xl">
              Hi, I&rsquo;m <em className="text-secondary">Tess!</em>
            </h1>
            <p className="mt-6 max-w-xl font-body text-lg text-tertiary">
              By day, I&rsquo;m an educator who loves creating engaging, welcoming spaces
              for students to learn and grow. Outside the classroom, I channel that same
              creativity into baking homemade cookies and treats inspired by comfort,
              nostalgia, and seasonal flavors.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <BiteButton href="/shop" size="lg">Shop the Treats</BiteButton>
              <BiteButton href="/custom" variant="secondary" size="lg">Request something custom</BiteButton>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-chocolate-lg">
            <Image
              src="/brand/tess-about.webp"
              alt="Tess Elaine Smith"
              width={600}
              height={750}
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="w-full h-auto object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="bg-surface-container px-6 py-section">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl shadow-chocolate-lg">
            <Image
              src="/brand/tess-cookie-box.webp"
              alt="Tess holding a TES Treats cookie box"
              width={600}
              height={750}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="w-full h-auto object-cover"
            />
          </div>
          <div>
            <p className="font-label uppercase tracking-[0.2em] text-on-secondary-container">
              The story
            </p>
            <h2 className="mt-2 font-headline text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Baked with love, shared with everyone.
            </h2>
            <div className="mt-6 space-y-4 text-tertiary">
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
            <div className="mt-8">
              <BiteButton href="/drops" variant="secondary" size="lg"
                biteColor="var(--color-surface-container)">
                See the latest drops
              </BiteButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
