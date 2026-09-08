<script lang="ts">
	import { page } from '$app/state';
	import { cleanCourseName } from '$lib/schoology';
	import { brand } from '$lib/brand';
	import { buttonVariants } from '$lib/components/ui/button';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import {
		initializeSchoologyCatalog,
		logOutSchoology,
		schoologyState
	} from '$lib/schoologyCatalog.svelte';
	import AppWindowMacIcon from '@lucide/svelte/icons/app-window-mac';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MessageSquareWarningIcon from '@lucide/svelte/icons/message-square-warning';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import SunIcon from '@lucide/svelte/icons/sun';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { mode, toggleMode } from 'mode-watcher';
	import { onMount, type Component } from 'svelte';
	import { fade } from 'svelte/transition';
	import { installPrompt } from '../../hooks.client';

	function logOut() {
		logOutSchoology();
	}

	const courses = $derived(schoologyState.courses);

	function installWebApp() {
		$installPrompt.prompt?.();
	}

	const data = {
		grades: {
			title: 'Grades',
			url: '/grades',
			icon: NotebookTextIcon
		},
		pwaPrompt: {
			title: 'Install Web App',
			onclick: installWebApp,
			icon: AppWindowMacIcon
		},
		feedback: {
			title: 'Feedback',
			url: '/feedback',
			icon: MessageSquareWarningIcon
		},
		switchSource: {
			title: 'Switch source',
			url: '/login',
			icon: UploadIcon
		},
		logOut: {
			title: 'Log Out',
			onclick: logOut,
			icon: LogOutIcon
		}
	};

	onMount(() => {
		initializeSchoologyCatalog();
	});
</script>

{#snippet menuItem({
	title,
	url,
	onclick,
	icon: Icon
}: {
	title: string;
	url?: string;
	onclick?: () => void;
	icon: Component;
})}
	<Sidebar.MenuItem>
		<Sidebar.MenuButton class="h-10 text-base">
			{#snippet child({ props })}
				{#if url}
					<a href={url} {...props}>
						<Icon /> <span>{title}</span>
					</a>
				{:else}
					<button {onclick} {...props}>
						<Icon /> <span>{title}</span>
					</button>
				{/if}
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{/snippet}

<Sidebar.Root>
	<Sidebar.Header>
		<Sidebar.MenuItem>
			<div class="m-2 flex flex-row items-center">
				<img src="/favicon.svg" class="size-6" alt={brand} />
				<span class="ml-2 text-lg font-bold tracking-tight">
					{brand}
					{#if schoologyState.source === 'demo'}
						<span class="text-muted-foreground">Demo</span>
					{/if}
				</span>
			</div>
		</Sidebar.MenuItem>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="h-10 text-base">
					{#snippet child({ props })}
						<a href={data.grades.url} {...props}>
							<data.grades.icon /> <span>{data.grades.title}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>

				<svelte:boundary>
					{#if courses}
						<Sidebar.MenuSub>
							{#each courses as course, index (course.id + ':' + index)}
								<Sidebar.MenuSubItem>
									<Sidebar.MenuSubButton
										class="h-8 truncate text-base {page.params.index === index.toString()
											? 'font-bold'
											: ''}"
									>
										{#snippet child({ props })}
											<a href={`${data.grades.url}/${index.toString()}`} {...props}>
												{cleanCourseName(course.title)}
											</a>
										{/snippet}
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
							{/each}
						</Sidebar.MenuSub>
					{/if}

					{#snippet pending()}
						<Sidebar.MenuSub>
							<div class="flex w-full items-center justify-center p-4">
								<Spinner />
							</div>
						</Sidebar.MenuSub>
					{/snippet}
				</svelte:boundary>
			</Sidebar.MenuItem>

			{@render menuItem(data.switchSource)}
		</Sidebar.Menu>

		<Sidebar.MenuItem class="mx-2 mt-auto">
			<Button
				href="/privacy"
				variant="ghost"
				class="text-muted-foreground h-auto border py-3 text-xs whitespace-normal"
			>
				Your grades stay on your device. The local backend talks to Schoology from your own
				computer.
			</Button>
		</Sidebar.MenuItem>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu class="gap-2">
			{#if $installPrompt.prompt}
				<div transition:fade>
					{@render menuItem(data.pwaPrompt)}
				</div>
			{/if}

			{@render menuItem(data.feedback)}

			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="h-10 text-base">
					{#snippet child({ props })}
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground px-2 text-sm">
								{schoologyState.source === 'demo'
									? 'Demo data'
									: schoologyState.source === 'upload' || schoologyState.source === 'import'
										? 'Imported'
										: 'Schoology live'}
							</span>

							<DropdownMenu.Root>
								<DropdownMenu.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon-lg' })}>
									<span class="sr-only">Settings</span>
									<data.logOut.icon />
								</DropdownMenu.Trigger>

								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={toggleMode} class="h-9">
										<MoonIcon
											class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
										/>
										<SunIcon
											class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
										/>
										{mode.current === 'light' ? 'Dark Mode' : 'Light Mode'}
									</DropdownMenu.Item>

									<DropdownMenu.Item onclick={data.logOut.onclick} class="h-9">
										<data.logOut.icon />
										{data.logOut.title}
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
