import type { CalendarDef, Holiday } from '../types';

const h = (date: string, en: string, pt = en): Holiday => ({
  date,
  name: { en, pt },
  kind: 'full',
});

// 2026: Government of Karnataka general holidays (DPAR Notification-I), including festivals that
// fall on Sundays / second Saturdays. 2027: the Karnataka list is not yet published, so this uses
// the Government of India gazetted holidays (DoPT O.M. 16.07.2026) plus Kannada Rajyotsava.
// Replace 2027 with the Karnataka notification when DPAR issues it.
export const inKa: CalendarDef = {
  info: {
    id: 'in-ka',
    status: 'public',
    sources: [
      'https://dpar.karnataka.gov.in/',
      'https://dopt.gov.in/',
      'https://www.staffnews.in/2026/07/list-of-holidays-2027-to-be-observed-in-central-government-offices.html',
    ],
  },
  rules: [
    {
      type: 'list',
      entries: [
        h('2026-01-15', 'Makara Sankranti'),
        h('2026-01-26', 'Republic Day', 'Dia da República'),
        h('2026-02-15', 'Maha Shivaratri'),
        h('2026-03-19', 'Ugadi'),
        h('2026-03-21', 'Khutub-E-Ramzan (Eid al-Fitr)'),
        h('2026-03-31', 'Mahaveera Jayanthi'),
        h('2026-04-03', 'Good Friday', 'Sexta-feira Santa'),
        h('2026-04-14', 'Dr. B. R. Ambedkar Jayanthi'),
        h('2026-04-20', 'Basava Jayanthi / Akshaya Tritiya'),
        h('2026-05-01', 'May Day', 'Dia do Trabalho'),
        h('2026-05-28', 'Bakrid (Eid al-Adha)'),
        h('2026-06-26', 'Last Day of Muharram', 'Último dia de Muharram'),
        h('2026-08-15', 'Independence Day', 'Dia da Independência da Índia'),
        h('2026-08-26', 'Eid-Milad'),
        h('2026-09-14', 'Varasiddhi Vinayaka Vrata'),
        h('2026-10-02', 'Gandhi Jayanti'),
        h('2026-10-10', 'Mahalaya Amavasya'),
        h('2026-10-20', 'Mahanavami / Ayudha Pooja'),
        h('2026-10-21', 'Vijayadashami'),
        h('2026-10-25', 'Maharishi Valmiki Jayanti'),
        h('2026-11-01', 'Kannada Rajyotsava'),
        h('2026-11-08', 'Naraka Chaturdashi'),
        h('2026-11-10', 'Balipadyami / Deepavali'),
        h('2026-11-27', 'Kanakadasa Jayanthi'),
        h('2026-12-25', 'Christmas Day', 'Natal'),
        h('2027-01-26', 'Republic Day', 'Dia da República'),
        h('2027-03-10', 'Eid al-Fitr'),
        h('2027-03-23', 'Holi'),
        h('2027-03-26', 'Good Friday', 'Sexta-feira Santa'),
        h('2027-04-15', 'Ram Navami'),
        h('2027-04-19', 'Mahavir Jayanti'),
        h('2027-05-17', 'Bakrid (Eid al-Adha)'),
        h('2027-05-20', 'Buddha Purnima'),
        h('2027-06-16', 'Muharram'),
        h(
          '2027-08-15',
          'Independence Day / Milad-un-Nabi',
          'Dia da Independência da Índia / Milad-un-Nabi',
        ),
        h('2027-08-25', 'Janmashtami'),
        h('2027-10-02', 'Gandhi Jayanti'),
        h('2027-10-09', 'Vijayadashami (Dussehra)'),
        h('2027-10-29', 'Deepavali'),
        h('2027-11-01', 'Kannada Rajyotsava'),
        h('2027-11-14', 'Guru Nanak Jayanti'),
        h('2027-12-25', 'Christmas Day', 'Natal'),
      ],
    },
  ],
};
