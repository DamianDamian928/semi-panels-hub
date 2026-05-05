import { useMemo, useState } from 'react'
import type { ReactNode, SVGProps } from 'react'

type ReviewStatus = 'Draft' | 'In progress' | 'Completed'
type MainStage = 'BOM' | 'Documentation' | 'Costing'
type BomStage = 'MATVAR' | 'L1' | 'L2' | 'L3'
type ProcessStep = 'Main' | 'Connections' | 'Validation' | 'Normalization' | 'Comparison' | 'Review' | 'Decisions' | 'Output'
type AppView = 'dashboard' | 'settings-sources' | 'review-editor'


type SidebarIconName =
  | 'main'
  | 'connections'
  | 'validation'
  | 'normalization'
  | 'comparison'
  | 'review'
  | 'decisions'
  | 'output'

type SidebarStepDefinition = {
  step: ProcessStep
  label: string
  icon: SidebarIconName
}

type DashboardRow = {
  id: string
  intelModel: string
  status: ReviewStatus
  owner: string
  lastUpdated: string
}

type StepPurposeContent = {
  eyebrow: string
  title: string
  summary: string
  goal: string
  function: string
  yourRole: string
  example: string
  output: string
}

type SourceDefinition = {
  id: string
  name: string
  type: string
  location: string
  scope: string
}

type ConnectionTreeSection = {
  id: string
  label: string
  items?: { id: string; label: string }[]
}

type ConnectionCard = {
  id: string
  title: string
  subtitle: string
  line1Label: string
  line1Value: string
  line2Label: string
  line2Value: string
  status: 'Connected' | 'Connecting' | 'Not connected'
}

type ValidationState = 'Valid' | 'Warning' | 'Error' | 'Not checked'

const dashboardRows: DashboardRow[] = [
  {
    id: '1',
    intelModel: 'SEMI-0001',
    status: 'Draft',
    owner: 'Damian',
    lastUpdated: 'Today, 08:30',
  },
  {
    id: '2',
    intelModel: 'SEMI-0002',
    status: 'In progress',
    owner: 'Damian',
    lastUpdated: 'Yesterday, 15:20',
  },
  {
    id: '3',
    intelModel: 'SEMI-0003',
    status: 'Completed',
    owner: 'Damian',
    lastUpdated: 'Apr 24, 11:05',
  },
]

const sourceDefinitions: SourceDefinition[] = [
  {
    id: '1',
    name: 'Fishbowl',
    type: 'Excel',
    location: 'Local file / Fishbowl export',
    scope: 'Global',
  },
  {
    id: '2',
    name: 'Mass Production',
    type: 'Excel',
    location: 'SharePoint / Production / Forecast',
    scope: 'Global',
  },
  {
    id: '3',
    name: 'Parts&BOM',
    type: 'Excel',
    location: 'SharePoint / Production / Parts',
    scope: 'Global',
  },
  {
    id: '4',
    name: 'BOX documentation',
    type: 'PDF / Folder',
    location: 'Local folder / BOX documentation',
    scope: 'Global',
  },
  {
    id: '5',
    name: 'Sharepoint documentation',
    type: 'PDF / SharePoint',
    location: 'SharePoint / Documentation',
    scope: 'Global',
  },
  {
    id: '6',
    name: 'PLM SQL connection',
    type: 'SQL',
    location: 'Configured connection',
    scope: 'Global',
  },
]

const validationStatesBySource: Record<string, { state: ValidationState; message: string }> = {
  'Fishbowl': { state: 'Valid', message: 'Source checked and ready.' },
  'Mass Production': { state: 'Warning', message: 'Imported with minor gaps to review.' },
  'Parts&BOM': { state: 'Valid', message: 'Structure looks correct.' },
  'BOX documentation': { state: 'Error', message: 'Missing required file mapping.' },
  'Sharepoint documentation': { state: 'Not checked', message: 'Validation has not been run yet.' },
  'PLM SQL connection': { state: 'Valid', message: 'Connection test passed.' },
}

const validationStateClassName: Record<ValidationState, string> = {
  Valid: 'status status-completed',
  Warning: 'status status-progress',
  Error: 'status status-draft',
  'Not checked': 'status',
}

const statusClassName: Record<ReviewStatus, string> = {
  Draft: 'status status-draft',
  'In progress': 'status status-progress',
  Completed: 'status status-completed',
}

const mainStages: MainStage[] = ['BOM', 'Documentation', 'Costing']
const bomStages: BomStage[] = ['MATVAR', 'L1', 'L2', 'L3']

const sidebarSteps: SidebarStepDefinition[] = [
  { step: 'Main', label: 'Main', icon: 'main' },
  { step: 'Connections', label: 'Connections', icon: 'connections' },
  { step: 'Validation', label: 'Validation', icon: 'validation' },
  { step: 'Normalization', label: 'Normalization', icon: 'normalization' },
  { step: 'Comparison', label: 'Comparison', icon: 'comparison' },
  { step: 'Review', label: 'Review', icon: 'review' },
  { step: 'Decisions', label: 'Decisions', icon: 'decisions' },
  { step: 'Output', label: 'Output', icon: 'output' },
]


const connectionTree: Record<MainStage, ConnectionTreeSection[]> = {
  BOM: [
    {
      id: 'bom',
      label: 'BOM',
      items: [
        { id: 'matvar', label: 'Matvar' },
        { id: 'l1', label: 'Level L1' },
        { id: 'l2', label: 'Level L2' },
        { id: 'l3', label: 'Level L3' },
      ],
    },
  ],
  Documentation: [
    {
      id: 'documentation',
      label: 'Documentation',
    },
  ],
  Costing: [
    {
      id: 'costing',
      label: 'Costing',
    },
  ],
}


function SidebarGlyph({ name, className, ...props }: { name: SidebarIconName; className?: string } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const glyphs: Record<SidebarIconName, ReactNode> = {
    main: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </>
    ),
    connections: (
      <>
        <path d="M8 7.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M16.5 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M9.9 6.95l4.7 3.1" />
        <path d="M8 21.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M9.95 17.05l4.6-3.05" />
      </>
    ),
    validation: (
      <>
        <path d="M12 3l7 2.8v5.1c0 4.5-2.7 8.2-7 10.1-4.3-1.9-7-5.6-7-10.1V5.8L12 3Z" />
        <path d="m9.1 11.9 2 2.1 4-4.4" />
      </>
    ),
    normalization: (
      <>
        <path d="M4 7h10" />
        <path d="M4 17h16" />
        <path d="M10 7 7 4 4 7" />
        <path d="m14 17 3 3 3-3" />
        <path d="M17 7h3" />
      </>
    ),
    comparison: (
      <>
        <path d="M9 5 4 10l5 5" />
        <path d="m15 5 5 5-5 5" />
        <path d="M20 10H8" />
        <path d="M16 14H4" />
      </>
    ),
    review: (
      <>
        <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <circle cx="16.5" cy="15.5" r="2.5" />
        <path d="m18.3 17.3 2.2 2.2" />
      </>
    ),
    decisions: (
      <>
        <path d="M7 12.5 10 15.5 17 8.5" />
        <path d="M4.5 12.5 7.5 15.5" />
        <path d="M10.5 15.5 13.5 18.5 20 11" />
      </>
    ),
    output: (
      <>
        <path d="M12 4v10" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 18.5h14" />
        <path d="M6.5 21h11" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...props}>
      <g {...common}>{glyphs[name]}</g>
    </svg>
  )
}

function BrandGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#d9e8ff" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <path d="M4 10 16 4l12 6-12 6L4 10Z" fill="url(#brandGradient)" />
      <path d="M6.5 16 16 11.2 25.5 16 16 20.8 6.5 16Z" fill="url(#brandGradient)" opacity="0.82" />
      <path d="M9 21.5 16 18l7 3.5-7 3.5-7-3.5Z" fill="url(#brandGradient)" opacity="0.68" />
    </svg>
  )
}

const sourceCardTemplates: Record<string, ConnectionCard[]> = {
  matvar: [
    {
      id: 'fishbowl',
      title: 'Fishbowl',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Fishbowl',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'parts-bom',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-a',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  l1: [
    {
      id: 'fishbowl-l1',
      title: 'Fishbowl',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Fishbowl',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'plm-sql-l1',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connecting',
      status: 'Connecting',
    },
    {
      id: 'empty-b',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  l2: [
    {
      id: 'mass-production-l2',
      title: 'Mass Production',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Mass Production',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'parts-bom-l2',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
  ],
  l3: [
    {
      id: 'plm-sql-l3',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-c',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  'box-docs': [
    {
      id: 'box-doc-card',
      title: 'BOX documentation',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'BOX documentation',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-doc-a',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  'sharepoint-docs': [
    {
      id: 'sp-doc-card',
      title: 'Sharepoint documentation',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Sharepoint documentation',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'plm-doc-card',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connecting',
      status: 'Connecting',
    },
  ],
  'cost-rollup': [
    {
      id: 'mass-cost',
      title: 'Mass Production',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Mass Production',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
  ],
  'cost-review': [
    {
      id: 'parts-cost',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-cost',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
}

const stepPurposeContent: Record<ProcessStep, StepPurposeContent> = {
  Main: {
    eyebrow: 'Main',
    title: 'Punkt startowy review i szybki obraz stanu projektu',
    summary: 'To jest główny ekran review. Tutaj widzisz ogólny stan projektu, najważniejsze sygnały z całego procesu i to, od czego warto zacząć. Ten ekran ma pomóc Ci szybko zorientować się, czy review jest dopiero na starcie, czy są już problemy do sprawdzenia, czy można iść dalej.',
    goal: 'Dać jedno proste miejsce do zrozumienia projektu przed wejściem głębiej w źródła, sprawdzenia i decyzje.',
    function: 'Pokazuje aktywny kontekst pracy dla BOM, Documentation i Costing oraz status review potrzebny do wybrania kolejnego kroku.',
    yourRole: 'Na tym etapie nie pracujesz jeszcze na szczegółowych danych. Twoim zadaniem jest ocenić, w jakim miejscu procesu jesteś i zdecydować, do którego kroku wejść dalej.',
    example: 'Przykład: wchodzisz na review i od razu widzisz, że źródła są już podłączone, walidacja ma warningi, a Comparison jeszcze nie było uruchomione. Dzięki temu wiesz, że najpierw powinieneś sprawdzić Validation, a nie przechodzić od razu do decyzji.',
    output: 'Masz szybki, czytelny obraz sytuacji i wiesz, gdzie wkroczyć w kolejnym kroku.',
  },
  Connections: {
    eyebrow: 'Connections',
    title: 'Wybór i podłączenie źródeł danych do review',
    summary: 'Tutaj aplikacja pracuje na źródłach, z których będzie budowany cały proces review. Ten etap służy do wskazania, które dane mają wejść do systemu, skąd pochodzą i czy są gotowe do użycia dalej.',
    goal: 'Podłączyć właściwy zestaw źródeł do właściwej części review.',
    function: 'Pozwala przypisać globalne źródła do obszarów BOM, Documentation i Costing, aby dalsze kroki pracowały na jednym uzgodnionym zestawie wejściowym.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy trzeba wskazać lub podłączyć właściwe źródła do review. Twoją rolą jest zadbać, żeby system pracował na poprawnych wejściach, ale nie edytujesz samych danych źródłowych.',
    example: 'Przykład: dla części BOM wybierasz Parts&BOM i Fishbowl, dla dokumentacji wskazujesz BOX documentation i Sharepoint documentation, a dla danych referencyjnych zostawiasz PLM SQL connection. Dzięki temu kolejne etapy wiedzą, na czym mają pracować.',
    output: 'System wie, z jakich źródeł ma korzystać w dalszych etapach i może przejść do walidacji oraz przetwarzania.',
  },
  Validation: {
    eyebrow: 'Validation',
    title: 'Sprawdzenie, czy dane wejściowe nadają się do dalszego procesu',
    summary: 'Ten etap pokazuje, czy źródła zostały poprawnie użyte i czy dane są wystarczająco poprawne, żeby system mógł przejść dalej. Tutaj oddzielamy błędy blokujące od warningów i od zwykłych informacji technicznych.',
    goal: 'Wychwycić problemy wejściowe wcześnie, zanim stworzą fałszywe różnice albo złe decyzje review.',
    function: 'Pokazuje gotowość źródeł, błędy blokujące, warningi i luki, które trzeba jeszcze zamknąć, zanim dane pójdą dalej.',
    yourRole: 'Wkraczasz tutaj wtedy, gdy system pokazuje problem z wejściem. Twoim zadaniem jest ocenić, czy trzeba poprawić źródło, podmienić plik, czy można iść dalej mimo warningu.',
    example: 'Przykład: jeśli Parts&BOM ma poprawny plik, ale BOX documentation ma brak wymaganego mapowania albo Sharepoint documentation nie zostało jeszcze sprawdzone, to tutaj decydujesz, czy najpierw naprawiasz wejście, czy świadomie zostawiasz warning i idziesz dalej.',
    output: 'Wiesz, czy dane są gotowe do dalszego przetwarzania, czy trzeba zatrzymać proces i poprawić wejście.',
  },
  Normalization: {
    eyebrow: 'Normalization',
    title: 'Ujednolicanie danych do jednego wspólnego modelu',
    summary: 'Tutaj system bierze dane z różnych źródeł i zamienia je na jeden wspólny układ, żeby w kolejnym kroku można je było porównywać w spójny sposób. To jest moment przejścia ze świata różnych plików, różnych kolumn, różnych nazw i różnych układów danych do jednego centralnego modelu review.',
    goal: 'Usunąć chaos formatów bez zmieniania oryginalnych danych źródłowych.',
    function: 'Mapuje dane read-only ze źródeł do jednego wspólnego modelu wewnętrznego, cały czas zachowując informację o pochodzeniu każdego rekordu.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy chcesz sprawdzić, czy system dobrze przygotował dane do dalszych porównań. Nie ustawiasz tu jeszcze reguł porównania i nie rozstrzygasz różnic, ale kontrolujesz, czy dane zostały poprawnie ujednolicone.',
    example: 'Przykład: w jednym źródle część ma inną nazwę kolumny, w drugim inaczej zapisane ilości, a w trzecim inny układ poziomów BOM. Na tym ekranie nie pytasz jeszcze, które źródło ma rację, tylko sprawdzasz, czy system poprawnie sprowadził te dane do jednego wspólnego modelu gotowego do Comparison.',
    output: 'System przygotowuje jeden wspólny model danych gotowy do uruchomienia porównań.',
  },
  Comparison: {
    eyebrow: 'Comparison',
    title: 'Wykrywanie istotnych różnic między źródłami',
    summary: 'Tutaj system porównuje znormalizowane dane i wykrywa rozbieżności, które mają znaczenie dla review BOM. To tutaj uruchamiane są reguły porównań, a różnice są zamieniane w konkretne wyniki gotowe do dalszej analizy.',
    goal: 'Wykryć różnice, które naprawdę mają znaczenie dla review BOM.',
    function: 'Uruchamia reguły porównań dla brakujących części, różnic ilościowych, konfliktów struktury, duplikatów i innych rozbieżności między źródłami.',
    yourRole: 'To jest jeden z ważniejszych momentów Twojego wejścia. Tutaj ustalasz i rozwijasz logikę porównań, czyli reguły, według których system ma wykrywać różnice między plikami i źródłami. Twoją rolą jest zdecydować, jakie porównania mają mieć znaczenie biznesowe i jak system ma interpretować rozbieżności.',
    example: 'Przykład: możesz zdecydować, że dla BOM najważniejsze są braki części, różnice ilości, konflikty parent-child i duplikaty, a mniej istotne są niektóre różnice opisowe. To właśnie tutaj definiujesz, które reguły mają tworzyć issue i co ma być później pokazane użytkownikowi w Review.',
    output: 'Aplikacja tworzy listę różnic, braków, konfliktów i innych issue, które przejdą dalej do Review.',
  },
  Review: {
    eyebrow: 'Review',
    title: 'Główne miejsce analizy wykrytych problemów',
    summary: 'To jest centralny workspace review. Tutaj widzisz wszystkie issue wykryte przez system, ich źródła, szczegóły rekordu i kontekst potrzebny do zrozumienia problemu. To ma być główne miejsce pracy analitycznej.',
    goal: 'Pozwolić użytkownikowi zrozumieć każde issue, porównać kontekst źródeł i zdecydować, co naprawdę wymaga działania.',
    function: 'Grupuje wyniki, pokazuje szczegóły issue, źródła danych i pomaga skupić się najpierw na tym, co najważniejsze.',
    yourRole: 'Tutaj wchodzisz najmocniej. Twoim zadaniem jest przejrzeć wykryte problemy, filtrować je, porównywać źródła, analizować szczegóły i zdecydować, które sprawy wymagają decyzji, a które są już jasne.',
    example: 'Przykład: system wykrył brak części w jednym źródle, różnicę ilości w drugim i konflikt struktury w trzecim. Na ekranie Review sprawdzasz szczegóły tych issue, patrzysz z jakich źródeł pochodzą, oceniasz ich wagę i decydujesz, które trzeba rozstrzygnąć od razu.',
    output: 'Masz jedno centrum pracy na wszystkich problemach i nie musisz szukać ich po wielu ekranach.',
  },
  Decisions: {
    eyebrow: 'Decisions',
    title: 'Świadome rozstrzyganie problemów wykrytych w review',
    summary: 'Tutaj zapisują się decyzje dotyczące issue wykrytych wcześniej przez system. To ważny etap, bo problem i decyzja to nie jest to samo: system wykrywa problem, ale to użytkownik rozstrzyga, co z nim zrobić.',
    goal: 'Zachować czysty podział między tym, co system wykrył, a tym, co użytkownik zdecydował.',
    function: 'Zapisuje zaakceptowane rozwiązania, pominięte issue, uzasadnienia i inne dane decyzyjne bez nadpisywania prawdy źródłowej.',
    yourRole: 'To jest Twój etap decyzyjny. Tutaj wybierasz właściwy wariant, oznaczasz issue jako rozwiązane, zignorowane albo wymagające dalszej pracy i zapisujesz uzasadnienie. Tu formalnie wkraczasz jako osoba odpowiedzialna za rozstrzygnięcie.',
    example: 'Przykład: po analizie w Review decydujesz, że jedna różnica ilościowa jest prawidłowa i powinna zostać zaakceptowana, druga wymaga dalszego sprawdzenia, a trzecia może zostać świadomie zignorowana. Każda z tych decyzji zapisuje się oddzielnie od samego issue i nie zmienia danych źródłowych.',
    output: 'Powstaje audytowalna warstwa decyzji review, oddzielona od danych wejściowych.',
  },
  Output: {
    eyebrow: 'Output',
    title: 'Generowanie końcowego wyniku review',
    summary: 'To jest etap tworzenia finalnego rezultatu procesu. Tutaj system generuje wynik, który ma być użyteczny biznesowo: finalny BOM, raport różnic, raport braków, eksport Excel albo inny artefakt końcowy.',
    goal: 'Wygenerować wynik końcowy, do którego można wrócić i którego można użyć dalej.',
    function: 'Buduje finalny BOM, raporty różnic, raporty braków, eksporty i inne artefakty końcowe wynikające z review oraz zapisanych decyzji.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy review jest już wystarczająco przeanalizowane i rozstrzygnięte. Twoim zadaniem jest zdecydować, kiedy wynik jest gotowy do wygenerowania i który rezultat ma być finalnym wyjściem procesu.',
    example: 'Przykład: po zamknięciu najważniejszych issue generujesz finalny BOM do dalszej pracy, raport różnic dla engineeringu i eksport Excel dla produkcji. Jeśli później review się zmieni, system może zapisać kolejną wersję outputu bez utraty historii.',
    output: 'Powstaje trwały, zapisany wynik review, do którego można wrócić razem z historią decyzji i audytem.',
  },
}

const nextStepByProcess: Record<ProcessStep, { title: string; description: string }> = {
  Main: {
    title: 'Main project workspace',
    description: 'This opens the current BOM, Documentation and Costing view without changes.',
  },
  Connections: {
    title: 'Connections',
    description: 'Global sources are linked to this review here.',
  },
  Validation: {
    title: 'Validation',
    description: 'This step will check if source inputs are ready.',
  },
  Normalization: {
    title: 'Normalization',
    description: 'This step will prepare one common model from all sources.',
  },
  Comparison: {
    title: 'Comparison',
    description: 'This step will compare sources and find differences.',
  },
  Review: {
    title: 'Review',
    description: 'This step will become the main workspace for issue analysis.',
  },
  Decisions: {
    title: 'Decisions',
    description: 'This step will store user decisions separately from issues.',
  },
  Output: {
    title: 'Output',
    description: 'This step will show exports, results and history.',
  },
}

const stageDescriptions: Record<MainStage, { title: string; description: string; connectionTitle: string }> = {
  BOM: {
    title: 'BOM workspace',
    description: 'Main work area for BOM-related setup. This is where MATVAR, L1, L2 and L3 will live.',
    connectionTitle: 'BOM connections',
  },
  Documentation: {
    title: 'Documentation workspace',
    description: 'Reserved for documentation inputs, checks and future review logic.',
    connectionTitle: 'Documentation connections',
  },
  Costing: {
    title: 'Costing workspace',
    description: 'Reserved for costing inputs and later business comparison logic.',
    connectionTitle: 'Costing connections',
  },
}

const activeStepByStatus: Record<ReviewStatus, ProcessStep> = {
  Draft: 'Main',
  'In progress': 'Review',
  Completed: 'Output',
}

export default function App() {
  const [isAdmin] = useState(true)
  const [appView, setAppView] = useState<AppView>('dashboard')
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [activeMainStage, setActiveMainStage] = useState<MainStage>('BOM')
  const [activeBomStage, setActiveBomStage] = useState<BomStage>('MATVAR')
  const [activeProcessStep, setActiveProcessStep] = useState<ProcessStep>('Main')
  const [activeConnectionNodeId, setActiveConnectionNodeId] = useState<string>('matvar')

  const selectedReview = useMemo(
    () => dashboardRows.find((row) => row.id === selectedReviewId) ?? null,
    [selectedReviewId],
  )


  const connectionsCustomStyles = `
    .connections-stage { padding: 0; }
    .connections-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 560px; }
    .connections-tree { padding: 24px 18px; border-right: 1px solid rgba(98,132,173,0.16); background: linear-gradient(180deg, rgba(11, 24, 40, 0.98), rgba(7, 18, 31, 0.98)); }
    .connection-group + .connection-group { margin-top: 18px; }
    .connection-group-header { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 4px; border: none; background: transparent; color: #dbe8f8; text-align: left; }
    .connection-group-arrow { color: #b8cae3; font-size: 14px; }
    .connection-group-ring { width: 18px; height: 18px; border-radius: 999px; border: 2px solid #3d87de; box-shadow: inset 0 0 0 3px rgba(13,22,36,0.9); }
    .connection-group-title { font-weight: 700; }
    .connection-group-dot { margin-left: auto; width: 14px; height: 14px; border-radius: 999px; border: 2px solid rgba(153, 176, 206, 0.45); }
    .connection-group-dot-active { border-color: #4bc5ff; box-shadow: 0 0 12px rgba(75, 197, 255, 0.85); }
    .connection-group-items { margin: 6px 0 0 31px; padding-left: 14px; border-left: 1px solid rgba(88, 126, 174, 0.35); }
    .connection-item { width: 100%; display: flex; align-items: center; gap: 10px; margin: 6px 0; padding: 11px 12px; border-radius: 14px; border: 1px solid transparent; background: transparent; color: #9bc2ee; text-align: left; }
    .connection-item:hover { border-color: rgba(97,155,244,0.28); background: rgba(13,36,65,0.45); }
    .connection-item-active { border-color: rgba(82, 176, 255, 0.65); background: rgba(10, 48, 88, 0.62); box-shadow: inset 0 0 0 1px rgba(82,176,255,0.18), 0 0 18px rgba(45, 144, 255, 0.15); color: #dff1ff; }
    .connection-item-branch { width: 12px; height: 1px; background: rgba(123, 154, 194, 0.55); }
    .connection-item-label { font-weight: 600; }
    .connection-item-state { margin-left: auto; width: 13px; height: 13px; border-radius: 999px; border: 2px solid rgba(153,176,206,0.45); }
    .connection-item-state-active { border-color: #64d8ff; box-shadow: 0 0 12px rgba(100, 216, 255, 0.9); }
    .connections-content { padding: 28px; }
    .connections-header { margin-bottom: 24px; }
    .connections-card-wrap { display: grid; gap: 16px; }
    .connections-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .connection-source-card { padding: 20px; border-radius: 22px; border: 1px solid rgba(98,132,173,0.2); background: linear-gradient(180deg, rgba(17,31,50,0.95), rgba(11,24,40,0.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
    .connection-source-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .connection-source-brand { display: flex; gap: 14px; align-items: flex-start; }
    .connection-source-brand h4 { margin: 0 0 4px; font-size: 17px; color: #f8fbff; }
    .connection-source-brand p { margin: 0; color: #97acc8; font-size: 14px; }
    .connection-source-icon { width: 42px; height: 42px; border-radius: 14px; background: radial-gradient(circle at top, rgba(89,160,255,0.8), rgba(24,70,138,0.9)); box-shadow: 0 0 18px rgba(70, 134, 226, 0.35); }
    .connection-source-icon-connecting { background: radial-gradient(circle at top, rgba(255,212,87,0.92), rgba(160,120,20,0.95)); box-shadow: 0 0 18px rgba(255, 206, 84, 0.28); }
    .connection-source-icon-not-connected { background: radial-gradient(circle at top, rgba(124,143,168,0.75), rgba(52,68,92,0.95)); box-shadow: none; }
    .connection-source-menu { border: none; background: transparent; color: #8ea9c7; font-size: 22px; padding: 0; line-height: 1; }
    .connection-source-meta { display: grid; gap: 10px; margin: 0 0 18px; }
    .connection-source-meta div { display: grid; grid-template-columns: 72px 1fr; gap: 12px; }
    .connection-source-meta dt { color: #8ca5c2; }
    .connection-source-meta dd { margin: 0; color: #f4f8fd; }
    .connection-source-status { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
    .connection-source-status-dot { width: 10px; height: 10px; border-radius: 999px; background: currentColor; box-shadow: 0 0 10px currentColor; }
    .connection-source-status-connected { color: #68d391; }
    .connection-source-status-connecting { color: #ffd15b; }
    .connection-source-status-not-connected { color: #94a9c5; }
    .connection-source-actions { display: grid; gap: 12px; }
    .connection-source-select { width: 100%; border-radius: 12px; border: 1px solid rgba(97,155,244,0.22); background: rgba(8, 29, 56, 0.92); color: #dce9fb; padding: 12px 14px; }
    .connection-source-buttons { display: flex; gap: 10px; }
    @media (max-width: 1200px) { .connections-layout { grid-template-columns: 1fr; } .connections-tree { border-right: none; border-bottom: 1px solid rgba(98,132,173,0.16); } }
    @media (max-width: 900px) { .connections-card-grid { grid-template-columns: 1fr; } }
  `

  const openReview = (reviewId: string) => {
    setSelectedReviewId(reviewId)
    setAppView('review-editor')
  }

  const renderSourceNamesStep = (
    stepName: Exclude<ProcessStep, 'Main' | 'Connections'>,
    title: string,
    description: string,
    statusLabel: string,
  ) => {
    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">{stepName}</p>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDefinitions.map((source) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td>{statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Context panel">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>{stepName}</h2>
            <p>For now this screen uses only source names from global Sources.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Review step</dt>
              <dd>{stepName}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Rows shown</dt>
              <dd>{sourceDefinitions.length}</dd>
            </div>
          </dl>
        </aside>
      </section>
    )
  }


  const renderComparisonStep = () => {
    const comparisonRows = sourceDefinitions.map((source) => {
      if (source.name === 'Fishbowl') {
        return { id: source.id, name: source.name, status: 'Matched', comparedWith: 'Parts&BOM', message: 'No key BOM differences detected in this placeholder view.' }
      }
      if (source.name === 'Mass Production') {
        return { id: source.id, name: source.name, status: 'Needs review', comparedWith: 'PLM SQL connection', message: 'A few values would need comparison review here later.' }
      }
      if (source.name === 'Parts&BOM') {
        return { id: source.id, name: source.name, status: 'Matched', comparedWith: 'Fishbowl', message: 'Ready for comparison baseline in this placeholder view.' }
      }
      if (source.name === 'BOX documentation') {
        return { id: source.id, name: source.name, status: 'Missing link', comparedWith: 'Sharepoint documentation', message: 'Comparison cannot be completed until documentation is connected.' }
      }
      if (source.name === 'Sharepoint documentation') {
        return { id: source.id, name: source.name, status: 'Pending', comparedWith: 'BOX documentation', message: 'Waiting for full comparison setup.' }
      }
      return { id: source.id, name: source.name, status: 'Ready', comparedWith: 'Mass Production', message: 'Connection is ready to support future comparison rules.' }
    })

    const summary = comparisonRows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Comparison</p>
              <h3>Comparison overview</h3>
              <p>This screen will be used for BOM comparison rules, detected differences and review-ready problems.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <span>Matched</span>
                <strong>{summary['Matched'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Needs review</span>
                <strong>{summary['Needs review'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Missing link</span>
                <strong>{summary['Missing link'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Pending</span>
                <strong>{summary['Pending'] ?? 0}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Compared with</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.comparedWith}</td>
                      <td>{row.status}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Comparison summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Comparison</h2>
            <p>Here we will define what is compared, what differs and what becomes an issue for review.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Total sources</dt>
              <dd>{comparisonRows.length}</dd>
            </div>
            <div>
              <dt>Main purpose</dt>
              <dd>Rules and differences</dd>
            </div>
          </dl>

          <div className="activity-feed" style={{ marginTop: 20 }}>
            <article className="activity-item">
              <strong>What comes later here</strong>
              <p>Real BOM comparison rules, quantity differences, missing parts, parent-child issues and review issues.</p>
            </article>
          </div>
        </aside>
      </section>
    )
  }

  const renderValidationStep = () => {
    const validationRows = sourceDefinitions.map((source) => ({
      id: source.id,
      name: source.name,
      ...(validationStatesBySource[source.name] ?? { state: 'Not checked' as ValidationState, message: 'Validation has not been run yet.' }),
    }))

    const summary = validationRows.reduce(
      (acc, row) => {
        acc[row.state] += 1
        return acc
      },
      { Valid: 0, Warning: 0, Error: 0, 'Not checked': 0 } as Record<ValidationState, number>,
    )

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Validation</p>
              <h3>Validation status</h3>
              <p>This screen checks whether connected sources are ready for the next steps.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <span>Valid</span>
                <strong>{summary['Valid']}</strong>
              </article>
              <article className="stat-card">
                <span>Warning</span>
                <strong>{summary['Warning']}</strong>
              </article>
              <article className="stat-card">
                <span>Error</span>
                <strong>{summary['Error']}</strong>
              </article>
              <article className="stat-card">
                <span>Not checked</span>
                <strong>{summary['Not checked']}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>
                        <span className={validationStateClassName[row.state]}>{row.state}</span>
                      </td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Validation summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Validation</h2>
            <p>Quick summary of source readiness for this review.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Total sources</dt>
              <dd>{validationRows.length}</dd>
            </div>
            <div>
              <dt>Ready to continue</dt>
              <dd>{summary.Error === 0 ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <div className="activity-feed" style={{ marginTop: 20 }}>
            <article className="activity-item">
              <strong>Next action</strong>
              <p>{summary.Error > 0 ? 'Fix source errors before moving forward.' : 'Validation can move forward.'}</p>
            </article>
          </div>
        </aside>
      </section>
    )
  }

  if (appView === 'settings-sources') {
    return (
      <div className="app-shell">
        <header className="page-header page-header-row">
          <div>
            <p className="eyebrow">Semi Panels Hub</p>
            <h1>Settings / Sources</h1>
            <p className="page-subtitle">One global source library for the whole app. Define once, reuse in all projects.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="header-button" onClick={() => setAppView('dashboard')}>
              ← Dashboard
            </button>
          </div>
        </header>

        <main className="page-content settings-layout">
          <section className="card settings-intro-card">
            <div className="settings-intro-grid">
              <div>
                <p className="section-label">Global library</p>
                <h3>Sources are configured here only once</h3>
                <p className="helper-text">
                  Excel, PDF, SQL and other sources will live here. Projects will only create connections to these global items.
                </p>
              </div>
              <div className="settings-note-box">
                <strong>Important</strong>
                <span>Connections in projects use this shared source library. No repeated local file picking per project.</span>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Scope</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDefinitions.map((source) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td>{source.type}</td>
                      <td>{source.location}</td>
                      <td>{source.scope}</td>
                      <td>
                        <button type="button" className="table-action">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (appView === 'review-editor' && selectedReview) {
    const statusDefaultStep = activeStepByStatus[selectedReview.status]
    const currentProcessStep = activeProcessStep ?? statusDefaultStep
    const nextStep = nextStepByProcess[currentProcessStep]
    const purposeContent = stepPurposeContent[currentProcessStep]
    const activeStageInfo = stageDescriptions[activeMainStage]
    const currentScope = activeMainStage === 'BOM' ? `BOM / ${activeBomStage}` : activeMainStage
    const isMainStep = currentProcessStep === 'Main'

    const allConnectionSections = [
      ...connectionTree.BOM,
      ...connectionTree.Documentation,
      ...connectionTree.Costing,
    ]
    const activeConnectionSections = allConnectionSections
    const activeConnectionCards = sourceCardTemplates[activeConnectionNodeId] ?? []
    const activeConnectionSection = allConnectionSections.find(
      (section) => section.items?.some((item) => item.id === activeConnectionNodeId) || section.id === activeConnectionNodeId,
    )
    const activeConnectionLabel = activeConnectionSection?.items?.find((item) => item.id === activeConnectionNodeId)?.label ?? activeConnectionSection?.label ?? 'Stage'
    const activeConnectionMainLabel = activeConnectionSection?.label ?? 'BOM'

    return (
      <div className="editor-shell">
        <aside className="review-sidebar">
          <div className="review-sidebar-top">
            <div className="review-brand">
              <BrandGlyph className="review-brand-icon" />
              <div>
                <p className="review-brand-name">Semi Panels Hub v2</p>
                <p className="review-brand-subtitle">Review workspace</p>
              </div>
            </div>

            <div className="review-project-chip">
              <span className="review-project-label">Current review</span>
              <strong>{selectedReview.intelModel}</strong>
            </div>

            <button type="button" className="sidebar-dashboard-link" onClick={() => setAppView('dashboard')}>
              ← Dashboard
            </button>
          </div>

          <nav className="review-nav" aria-label="Review process">
            {sidebarSteps.map(({ step, label, icon }) => {
              const isActive = step === currentProcessStep
              return (
                <button
                  key={step}
                  type="button"
                  className={`review-nav-item ${isActive ? 'review-nav-item-active' : ''}`}
                  onClick={() => setActiveProcessStep(step)}
                >
                  <span className="review-nav-icon-wrap" aria-hidden="true">
                    <SidebarGlyph name={icon} className="review-nav-icon" />
                  </span>
                  <span className="review-nav-label">{label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="editor-workspace">
          <style>{connectionsCustomStyles}</style>
          <header className="workspace-header card">
            <div>
              <p className="eyebrow">Admin project edit</p>
              <h1>{selectedReview.intelModel}</h1>
              <p className="page-subtitle">Left side = review flow. Right side = current selected screen.</p>
            </div>
            <div className="header-meta">
              <span className={statusClassName[selectedReview.status]}>{selectedReview.status}</span>
              <span className="meta-chip">Owner: {selectedReview.owner}</span>
              <span className="meta-chip">Updated: {selectedReview.lastUpdated}</span>
            </div>
          </header>

          {isMainStep ? (
            <section className="workspace-main-grid">
              <section className="workspace-main card">
                <div className="stage-tabs" role="tablist" aria-label="Main project stages">
                  {mainStages.map((stage, index) => {
                    const isActive = activeMainStage === stage
                    return (
                      <button
                        key={stage}
                        type="button"
                        className={`stage-tab ${isActive ? 'stage-tab-active' : ''}`}
                        onClick={() => {
                          setActiveMainStage(stage)
                          const nextSection = connectionTree[stage][0]
                          const nextItemId = nextSection.items?.[0]?.id ?? nextSection.id
                          setActiveConnectionNodeId(nextItemId)
                        }}
                        aria-pressed={isActive}
                      >
                        <span className="stage-tab-index">[{index + 1}. {stage}]</span>
                        {isActive ? <span className="stage-tab-badge">Active</span> : null}
                      </button>
                    )
                  })}
                </div>

                {activeMainStage === 'BOM' ? (
                  <div className="substage-tabs" role="tablist" aria-label="BOM sections">
                    {bomStages.map((stage) => {
                      const isActive = activeBomStage === stage
                      return (
                        <button
                          key={stage}
                          type="button"
                          className={`substage-tab ${isActive ? 'substage-tab-active' : ''}`}
                          onClick={() => {
                          setActiveBomStage(stage)
                          setActiveConnectionNodeId(stage.toLowerCase() === 'matvar' ? 'matvar' : stage.toLowerCase())
                        }}
                          aria-pressed={isActive}
                        >
                          [{stage}]
                          {isActive ? <span className="substage-tab-badge">Active</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <div className="workspace-card">
                  <div className="workspace-copy">
                    <p className="section-label">{currentScope}</p>
                    <h3>{activeStageInfo.title}</h3>
                    <p>{activeStageInfo.description}</p>
                  </div>

                  <div className="workspace-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-title">Main edit area</span>
                      <span className="placeholder-text">This right-side heart of the screen will grow from this skeleton.</span>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="workspace-side-panel card" aria-label="Context panel">
                <div className="sidebar-header">
                  <p className="section-label">Connection</p>
                  <h2>{activeStageInfo.connectionTitle}</h2>
                  <p>Projects do not create new sources here. They only connect to global sources from Settings.</p>
                </div>

                <div className="source-panel-placeholder">
                  <div className="source-icon">CN</div>
                  <div>
                    <h3>Connection panel placeholder</h3>
                    <p>Later we will map global sources to BOM, Documentation and Costing areas from this panel.</p>
                  </div>
                </div>

                <dl className="source-meta-list">
                  <div>
                    <dt>Review step</dt>
                    <dd>{currentProcessStep}</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{currentScope}</dd>
                  </div>
                  <div>
                    <dt>Project</dt>
                    <dd>{selectedReview.intelModel}</dd>
                  </div>
                  <div>
                    <dt>Source mode</dt>
                    <dd>Global shared library</dd>
                  </div>
                </dl>
              </aside>
            </section>
          ) : currentProcessStep === 'Connections' ? (
            <section className="workspace-main-grid">
              <section className="workspace-main card connections-stage">
                <div className="connections-layout">
                  <aside className="connections-tree" aria-label="Connection groups">
                    {activeConnectionSections.map((section) => {
                      const sectionActive = section.items?.some((item) => item.id === activeConnectionNodeId) ?? section.id === activeConnectionNodeId
                      return (
                        <div key={section.id} className={`connection-group ${sectionActive ? 'connection-group-active' : ''}`}>
                          <button type="button" className="connection-group-header">
                            <span className="connection-group-arrow">⌄</span>
                            <span className="connection-group-ring" aria-hidden="true" />
                            <span className="connection-group-title">[{section.label}]</span>
                            <span className={`connection-group-dot ${sectionActive ? 'connection-group-dot-active' : ''}`} aria-hidden="true" />
                          </button>

                          {section.items?.length ? (
                            <div className="connection-group-items">
                              {section.items.map((item) => {
                                const itemActive = item.id === activeConnectionNodeId
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`connection-item ${itemActive ? 'connection-item-active' : ''}`}
                                    onClick={() => {
                                      setActiveConnectionNodeId(item.id)
                                      if (activeMainStage === 'BOM') {
                                        if (item.id === 'matvar') setActiveBomStage('MATVAR')
                                        if (item.id === 'l1') setActiveBomStage('L1')
                                        if (item.id === 'l2') setActiveBomStage('L2')
                                        if (item.id === 'l3') setActiveBomStage('L3')
                                      }
                                    }}
                                  >
                                    <span className="connection-item-branch" aria-hidden="true" />
                                    <span className="connection-item-label">[{item.label}]</span>
                                    <span className={`connection-item-state ${itemActive ? 'connection-item-state-active' : ''}`} aria-hidden="true" />
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </aside>

                  <section className="connections-content">
                    <div className="connections-header">
                      <div>
                        <p className="section-label">Connections</p>
                        <h3>Connection configuration for: {activeConnectionMainLabel} &gt; {activeConnectionLabel}</h3>
                        <p>Left side shows the heart of the app. Right side lets you choose which sources belong to the selected stage.</p>
                      </div>
                    </div>

                    <div className="connections-card-wrap">
                      <p className="section-label">Active data connections</p>
                      <div className="connections-card-grid">
                        {activeConnectionCards.map((card) => (
                          <article key={card.id} className="connection-source-card">
                            <div className="connection-source-top">
                              <div className="connection-source-brand">
                                <div className={`connection-source-icon connection-source-icon-${card.status.toLowerCase().replace(/\s+/g, '-')}`} />
                                <div>
                                  <h4>{card.title}</h4>
                                  <p>{card.subtitle}</p>
                                </div>
                              </div>
                              <button type="button" className="connection-source-menu">⋮</button>
                            </div>

                            <dl className="connection-source-meta">
                              <div>
                                <dt>{card.line1Label}:</dt>
                                <dd>{card.line1Value}</dd>
                              </div>
                              <div>
                                <dt>{card.line2Label}:</dt>
                                <dd>{card.line2Value}</dd>
                              </div>
                              <div>
                                <dt>Status:</dt>
                                <dd className={`connection-source-status connection-source-status-${card.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <span className="connection-source-status-dot" />
                                  {card.status}
                                </dd>
                              </div>
                            </dl>

                            <div className="connection-source-actions">
                              <select className="connection-source-select" defaultValue={card.line1Value === 'Not selected' ? '' : card.line1Value}>
                                <option value="">Choose source</option>
                                {sourceDefinitions.map((source) => (
                                  <option key={source.id} value={source.name}>
                                    {source.name}
                                  </option>
                                ))}
                              </select>
                              <div className="connection-source-buttons">
                                <button type="button" className="table-action">Edit</button>
                                <button type="button" className="table-action">Disconnect</button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <aside className="workspace-side-panel card" aria-label="Context panel">
                <div className="sidebar-header">
                  <p className="section-label">Step</p>
                  <h2>Connections</h2>
                  <p>Use the left side to choose the real stage. Use the right side to decide which sources belong there.</p>
                </div>

                <dl className="source-meta-list">
                  <div>
                    <dt>Selected area</dt>
                    <dd>{activeMainStage}</dd>
                  </div>
                  <div>
                    <dt>Selected stage</dt>
                    <dd>{activeConnectionLabel}</dd>
                  </div>
                  <div>
                    <dt>Available sources</dt>
                    <dd>{sourceDefinitions.length}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Manual source assignment</dd>
                  </div>
                </dl>
              </aside>
            </section>
          ) : currentProcessStep === 'Validation' ? (
            renderValidationStep()
          ) : currentProcessStep === 'Normalization' ? (
            renderSourceNamesStep('Normalization', 'Ekran normalizacji', 'Ten etap będzie przygotowywać jeden wspólny model danych ze wszystkich źródeł.', 'Oczekuje')
          ) : currentProcessStep === 'Comparison' ? (
            renderComparisonStep()
          ) : currentProcessStep === 'Review' ? (
            renderSourceNamesStep('Review', 'Ekran review', 'Ten etap będzie głównym workspace do analizy issue i problemów wykrytych przez system.', 'Oczekuje')
          ) : currentProcessStep === 'Decisions' ? (
            renderSourceNamesStep('Decisions', 'Ekran decyzji', 'Ten etap będzie zapisywać decyzje użytkownika oddzielnie od issue i danych źródłowych.', 'Oczekuje')
          ) : (
            renderSourceNamesStep('Output', 'Ekran outputu', 'Ten etap będzie pokazywać finalne wyniki, eksporty i historię review.', 'Oczekuje')
          )}

          <section className="stage-purpose-card card" aria-label="Step purpose">
            <div className="stage-purpose-header">
              <div>
                <p className="section-label">{purposeContent.eyebrow}</p>
                <h3>{purposeContent.title}</h3>
              </div>
            </div>

            <p className="stage-purpose-summary">{purposeContent.summary}</p>

            <div className="stage-purpose-grid">
              <article className="stage-purpose-item">
                <span>Cel etapu</span>
                <p>{purposeContent.goal}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Rola etapu w aplikacji</span>
                <p>{purposeContent.function}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Twoja rola</span>
                <p>{purposeContent.yourRole}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Przykład w praktyce</span>
                <p>{purposeContent.example}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Efekt etapu</span>
                <p>{purposeContent.output}</p>
              </article>
              <article className="stage-purpose-item stage-purpose-item-next">
                <span>Co dalej</span>
                <p>{nextStep.description}</p>
              </article>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Review list with admin entry point to project edit mode.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="header-button" onClick={() => setAppView('settings-sources')}>
            Settings
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="card" aria-label="Review list">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Intel Model</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Last updated</th>
                  {isAdmin ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {dashboardRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.intelModel}</td>
                    <td>
                      <span className={statusClassName[row.status]}>{row.status}</span>
                    </td>
                    <td>{row.owner}</td>
                    <td>{row.lastUpdated}</td>
                    {isAdmin ? (
                      <td>
                        <button type="button" className="table-action" onClick={() => openReview(row.id)}>
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
