/**
 * contact-card — a cream card in the art-directed style of video 1's cookie
 * card (thin border, serif, letter-spaced small caps, [X] corner ornament),
 * sitting on ink. The email is the big line with a magnetic hover; socials are
 * small-caps links.
 */
import type { ContactProps } from '@shared/types';
import type { BlockRenderer, Cleanup } from './contract';
import { el, blockRoot } from './contract';
import { entrance, magnetic } from '../motion';
import './contact-card.css';

export const contactCard: BlockRenderer<ContactProps> = {
  type: 'contact-card',

  render(props): HTMLElement {
    const root = blockRoot({ id: 'contact', type: 'contact-card', props: {} }, 'ink');
    root.classList.add('contact');
    root.id = 'contact';

    const corner = el('span', { class: 'contact__corner', 'aria-hidden': 'true' }, ['[ × ]']);
    const kicker = el('p', { class: 'kicker', 'data-edit': 'kicker' }, [props.kicker]);
    const heading = el('h2', { class: 'contact__heading', 'data-edit': 'heading' }, [props.heading]);

    const email = el(
      'a',
      {
        class: 'contact__email',
        href: `mailto:${props.email}`,
        'data-edit': 'email',
        'data-cursor': 'link',
      },
      [props.email],
    );
    const emailWrap = el('div', { class: 'contact__email-wrap' }, [email]);

    const socials = el('div', { class: 'contact__socials' });
    props.socials.forEach((s, i) => {
      socials.append(
        el(
          'a',
          {
            class: 'contact__social meta',
            href: s.href,
            'data-edit': `socials.${i}.label`,
            'data-cursor': 'link',
            rel: 'noopener',
          },
          [s.label],
        ),
      );
    });

    const card = el('div', { class: 'contact__card' }, [
      corner,
      kicker,
      heading,
      el('hr', { class: 'rule contact__rule' }),
      emailWrap,
      socials,
    ]);

    root.append(el('div', { class: 'section-inner contact__inner' }, [card]));
    return root;
  },

  mount(root): Cleanup {
    entrance(root);
    const email = root.querySelector<HTMLElement>('.contact__email');
    if (email) magnetic(email);
    return () => {};
  },
};
